import { db, schema } from '@insights/shared/db';
import {
    connection,
    HAILPAD_ANALYSIS_QUEUE_NAME,
    type HailpadAnalysisTaskData,
    type HailpadAnalysisTaskResult
} from '@insights/shared/queue';
import { getFilePath, pollForResult } from '@insights/shared/utils';
import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const SERVICE_BASE_URL = process.env.HAILGEN_SERVICE_URL || 'http://hailgen-service:3000';
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const INTERVAL_MS = 10 * 1000; // 10 seconds

const SERVICE_HEADERS = {
    Authorization: `Bearer ${process.env.HAILGEN_SERVICE_API_KEY || 'default-api-key'}`
};

const uploadResponseSchema = z
    .object({
        taskId: z.string(),
        message: z.string().optional()
    })
    .or(
        z.object({
            error: z.string()
        })
    );

const statusSchema = z
    .object({
        success: z.literal(true)
    })
    .or(
        z.object({
            success: z.literal(false),
            message: z.string()
        })
    );

const dentsResultSchema = z.object({
    dents: z.array(
        z.object({
            angle: z.coerce.number().nullable(),
            centroidX: z.coerce.number(),
            centroidY: z.coerce.number(),
            majorAxis: z.coerce.number(),
            minorAxis: z.coerce.number(),
            maxDepth: z.coerce.number()
        })
    )
});

export const hailpadAnalysisWorker = new Worker<HailpadAnalysisTaskData, HailpadAnalysisTaskResult>(
    HAILPAD_ANALYSIS_QUEUE_NAME,
    async (job) => {
        const { hailpadId } = job.data;

        try {
            const hailpad = await db.query.hailpads.findFirst({
                where: (hailpads, { eq }) => eq(hailpads.id, hailpadId)
            });

            if (!hailpad) {
                throw new Error('Hailpad not found');
            }

            const depthMapFile = Bun.file(
                getFilePath({
                    folderName: hailpad.folderName,
                    fileName: 'depth_map.png',
                    type: 'hailpads'
                })
            );

            if (!(await depthMapFile.exists())) {
                throw new Error('Depth map file not found');
            }

            const maskFile = Bun.file(
                getFilePath({
                    folderName: hailpad.folderName,
                    fileName: 'mask.png',
                    type: 'hailpads'
                })
            );

            if (!(await maskFile.exists())) {
                throw new Error('Mask file not found');
            }

            const formData = new FormData();
            formData.append('depthMap', depthMapFile);
            formData.append('mask', maskFile);

            await db
                .update(schema.hailpads)
                .set({
                    analysisStatus: 'uploading'
                })
                .where(eq(schema.hailpads.id, hailpadId));

            const response = await fetch(`${SERVICE_BASE_URL}/upload`, {
                method: 'POST',
                headers: SERVICE_HEADERS,
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to initiate hailpad analysis');
            }

            await db
                .update(schema.hailpads)
                .set({
                    analysisStatus: 'processing'
                })
                .where(eq(schema.hailpads.id, hailpadId));

            const responseData = await response.json();
            const statusResult = uploadResponseSchema.safeParse(responseData);

            if (!statusResult.success) {
                throw new Error('Invalid response from hailgen service');
            }

            if ('error' in statusResult.data) {
                throw new Error(`Hailpad analysis failed: ${statusResult.data.error}`);
            }

            const { taskId } = statusResult.data;

            const pollResponse = await pollForResult<z.infer<typeof statusSchema>>({
                url: `${SERVICE_BASE_URL}/status/${taskId}`,
                fetchOptions: {
                    headers: SERVICE_HEADERS
                },
                validate: (data) => data?.success,
                timeoutMs: TIMEOUT_MS,
                intervalMs: INTERVAL_MS
            });

            const pollResponseData = statusSchema.parse(pollResponse);

            if (!pollResponseData.success) {
                throw new Error(`Hailpad analysis failed: ${pollResponseData.message}`);
            }

            console.log(`Hailpad analysis completed for hailpad ID: ${hailpadId}`);

            const resultResponse = await fetch(
                `${SERVICE_BASE_URL}/result/${taskId}?type=analysis`,
                {
                    headers: SERVICE_HEADERS
                }
            );

            if (!resultResponse.ok) {
                throw new Error('Failed to fetch hailpad analysis result');
            }

            const resultData = await resultResponse.json();
            const parsedResult = dentsResultSchema.parse(resultData);

            const newDents = await db.transaction(async (tx) => {
                await tx.delete(schema.dents).where(eq(schema.dents.hailpadId, hailpadId));
                return await tx
                    .insert(schema.dents)
                    .values(
                        parsedResult.dents.map((dent) => ({
                            hailpadId,
                            angle: String(dent.angle),
                            majorAxis: String(dent.majorAxis),
                            minorAxis: String(dent.minorAxis),
                            centroidX: String(dent.centroidX),
                            centroidY: String(dent.centroidY),
                            maxDepth: String(dent.maxDepth)
                        }))
                    )
                    .returning();
            });

            if (newDents.length !== parsedResult.dents.length) {
                throw new Error('Mismatch in number of dents inserted');
            }

            console.log(`Inserted ${newDents.length} dents for hailpad ID: ${hailpadId}`);

            await db.transaction(async (tx) => {
                const pads = await tx
                    .update(schema.hailpads)
                    .set({
                        analysisStatus: 'complete'
                    })
                    .where(eq(schema.hailpads.id, hailpadId))
                    .returning();

                if (pads.length === 0) {
                    throw new Error('Failed to update hailpad analysis status');
                }

                const pad = pads[0]!;

                // User already set maxDepth; set the hailpad status to complete
                if (Number(pad.maxDepth) > 0 && pad.status !== 'failed') {
                    await tx
                        .update(schema.hailpads)
                        .set({
                            status: 'complete'
                        })
                        .where(eq(schema.hailpads.id, hailpadId));
                }
            });

            return { success: true };
        } catch (error) {
            await db
                .update(schema.hailpads)
                .set({
                    analysisStatus: 'failed',
                    status: 'failed'
                })
                .where(eq(schema.hailpads.id, hailpadId));
            console.error('Error processing hailpad analysis task:', error);
            return { success: false, message: 'Error processing hailpad analysis task' };
        }
    },
    { connection }
);
