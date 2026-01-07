import { db, schema } from '@insights/shared/db';
import {
    connection,
    POINT_CLOUD_QUEUE_NAME,
    type PointCloudTaskData,
    type PointCloudTaskResult
} from '@insights/shared/queue';
import { getFileDirectory, getFilePath } from '@insights/shared/utils';
import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

export const pointCloudWorker = new Worker<PointCloudTaskData, PointCloudTaskResult>(
    POINT_CLOUD_QUEUE_NAME,
    async (job) => {
        const { scanId, scanFileName } = job.data;
        try {
            const scan = await db.query.scans.findFirst({
                where: (scans, { eq }) => eq(scans.id, scanId)
            });

            if (!scan) {
                throw new Error('Scan not found');
            }

            await db
                .update(schema.scans)
                .set({ status: 'in_progress' })
                .where(eq(schema.scans.id, scanId));

            const scanFilePath = getFilePath({
                folderName: scan.folderName,
                fileName: scanFileName,
                type: 'scans'
            });

            const file = Bun.file(scanFilePath);

            if (!(await file.exists())) {
                console.error(`[Scan ID: ${scanId}] Scan file not found at path: ${scanFilePath}`);
                throw new Error('Scan file not found');
            }

            const outputDir = `${getFileDirectory({
                folderName: scan.folderName,
                type: 'scans'
            })}/output`;

            const logPath = `${outputDir}/potree_conversion.log`;
            const logFile = Bun.file(logPath);

            if (await logFile.exists()) {
                await logFile.delete();
            }
            await Bun.write(logPath, '');

            const potreeProcess = Bun.spawn(
                [process.env.POTREE_CONVERTER_PATH!, scanFilePath, '-o', outputDir],
                {
                    stdout: logFile,
                    stderr: logFile
                }
            );

            const code = await potreeProcess.exited;

            if (code !== 0) {
                throw new Error(`PotreeConverter failed with code ${code}`);
            }

            await db
                .update(schema.scans)
                .set({ status: 'complete' })
                .where(eq(schema.scans.id, scanId));

            return {
                success: true
            };
        } catch (error) {
            try {
                await db
                    .update(schema.scans)
                    .set({ status: 'failed' })
                    .where(eq(schema.scans.id, scanId));
            } catch (dbError) {
                console.error(`[Scan ID: ${scanId}] Error updating scan status to failed`, dbError);
            }

            console.error(`[Scan ID: ${scanId}] Error processing point cloud task`, error);
            return {
                success: false,
                message: (error as Error).message || 'Unknown error occurred'
            };
        }
    },
    { name: 'point-cloud', connection }
);
