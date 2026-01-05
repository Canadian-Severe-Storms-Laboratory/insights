import { db, schema } from '@insights/shared/db';
import {
    BLUR_QUEUE_NAME,
    connection,
    type BlurTaskData,
    type BlurTaskResult
} from '@insights/shared/queue';
import { getFilePath, handleComplete } from '@insights/shared/utils';
import { Worker } from 'bullmq';
import { eq, or } from 'drizzle-orm';

export const blurWorker = new Worker<BlurTaskData, BlurTaskResult>(
    BLUR_QUEUE_NAME,
    async (job) => {
        const { captureId } = job.data;
        try {
            await db
                .update(schema.captures)
                .set({ status: 'processing' })
                .where(eq(schema.captures.id, captureId));

            const segment = await db.query.pathSegments.findFirst({
                where: (pathSegments, { eq, or }) =>
                    or(
                        eq(pathSegments.captureId, captureId),
                        eq(pathSegments.streetViewCaptureId, captureId)
                    )
            });

            if (!segment) {
                return { success: false, message: 'Path segment not found for capture' };
            }

            const captures = await db
                .select({
                    folderName: schema.paths.folderName,
                    fileName: schema.captures.fileName
                })
                .from(schema.paths)
                .innerJoin(schema.pathSegments, eq(schema.paths.id, schema.pathSegments.pathId))
                .innerJoin(
                    schema.captures,
                    or(
                        eq(schema.pathSegments.captureId, schema.captures.id),
                        eq(schema.pathSegments.streetViewCaptureId, schema.captures.id)
                    )
                )
                .where(eq(schema.captures.id, captureId));

            const capture = captures[0];

            if (captures.length === 0 || !capture) {
                return { success: false, message: 'Capture not found' };
            }

            const filePath = getFilePath({
                folderName: capture.folderName,
                fileName: capture.fileName,
                type: 'captures'
            });

            const file = Bun.file(filePath);

            await db
                .update(schema.captures)
                .set({ status: 'uploading' })
                .where(eq(schema.captures.id, captureId));

            if (!file.exists()) {
                return { success: false, message: 'Capture file not found on disk' };
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(process.env.BLUR_API_URL!, {
                method: 'POST',
                body: formData,
                headers: {
                    Authorization: `Bearer ${process.env.BLUR_API_KEY!}`
                }
            });

            if (!response.ok) {
                return { success: false, message: `Blur API error: ${response.statusText}` };
            }

            const blurredBuffer = await response.arrayBuffer();

            const result = await db.transaction(async (tx) => {
                const existingCapture = await tx.query.captures.findFirst({
                    where: eq(schema.captures.id, captureId)
                });

                if (!existingCapture) {
                    return { success: false, message: 'Capture no longer exists' };
                }

                await Bun.write(filePath, new Uint8Array(blurredBuffer));

                await db
                    .update(schema.captures)
                    .set({
                        status: 'complete'
                    })
                    .where(eq(schema.captures.id, captureId));

                return { success: true };
            });

            await handleComplete({ id: segment.pathId, table: 'paths' });

            return result;
        } catch (error) {
            try {
                await db
                    .update(schema.captures)
                    .set({
                        status: 'failed'
                    })
                    .where(eq(schema.captures.id, captureId));
            } catch (error) {
                console.error(`Error updating capture status for ID ${captureId}:`, error);
            }
            return { success: false, message: (error as Error).message };
        }
    },
    {
        name: 'blur',
        concurrency: 1,
        connection
    }
);
