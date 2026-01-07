import { db, schema } from '@insights/shared/db';
import {
    connection,
    DEPTH_MAP_QUEUE_NAME,
    type DepthMapTaskData,
    type DepthMapTaskResult
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

const statusSchema = z
    .object({
        success: z.literal(true),
        message: z.string().optional()
    })
    .or(
        z.object({
            success: z.literal(false)
        })
    );

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

export const depthMapWorker = new Worker<DepthMapTaskData, DepthMapTaskResult>(
    DEPTH_MAP_QUEUE_NAME,
    async (job) => {
        const { hailpadId } = job.data;

        try {
            const hailpad = await db.query.hailpads.findFirst({
                where: (hailpads, { eq }) => eq(hailpads.id, hailpadId)
            });

            if (!hailpad) {
                throw new Error('Hailpad not found');
            }

            const postHitFile = Bun.file(
                getFilePath({
                    folderName: hailpad.folderName,
                    fileName: 'post_hit.stl',
                    type: 'hailpads'
                })
            );

            if (!(await postHitFile.exists())) {
                throw new Error('Post-hit STL file not found for the specified hailpad');
            }

            const formData = new FormData();
            formData.append('postHit', postHitFile);

            await db
                .update(schema.hailpads)
                .set({
                    depthMapStatus: 'uploading'
                })
                .where(eq(schema.hailpads.id, hailpadId));

            const response = await fetch(`${SERVICE_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
                headers: SERVICE_HEADERS
            });

            if (!response.ok) {
                throw new Error('Failed to initiate depth map generation with Hailgen service');
            }

            await db
                .update(schema.hailpads)
                .set({
                    depthMapStatus: 'processing'
                })
                .where(eq(schema.hailpads.id, hailpadId));

            const responseData = uploadResponseSchema.parse(await response.json());

            if ('error' in responseData) {
                throw new Error(`Depth map generation failed: ${responseData.error}`);
            }

            const { taskId } = responseData;

            const pollResponse = await pollForResult<z.infer<typeof statusSchema>>({
                url: `${SERVICE_BASE_URL}/status/${taskId}`,
                fetchOptions: {
                    headers: SERVICE_HEADERS
                },
                validate: (data) => data?.success,
                intervalMs: INTERVAL_MS,
                timeoutMs: TIMEOUT_MS
            });

            const pollResponseData = statusSchema.parse(pollResponse);

            if (!pollResponseData.success) {
                if ('message' in pollResponseData && pollResponseData.message) {
                    throw new Error(`Depth map generation failed: ${pollResponseData.message}`);
                }
                throw new Error('Depth map generation failed without a specific error message');
            }

            console.log(`Depth map generation completed for hailpad ID: ${hailpadId}`);

            const resultResponse = await fetch(
                `${SERVICE_BASE_URL}/result/${taskId}?type=depth_map`,
                {
                    headers: SERVICE_HEADERS
                }
            );

            if (!resultResponse.ok) {
                throw new Error('Failed to fetch depth map result from Hailgen service');
            }

            const resultData = await resultResponse.blob();

            const depthMapPath = getFilePath({
                folderName: hailpad.folderName,
                fileName: 'depth_map.png',
                type: 'hailpads'
            });

            const arrayBuffer = await resultData.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            await Bun.write(depthMapPath, uint8Array);

            console.log(`Depth map generated and saved for hailpad ID: ${hailpadId}`);

            await db
                .update(schema.hailpads)
                .set({
                    depthMapStatus: 'complete'
                })
                .where(eq(schema.hailpads.id, hailpadId));

            return { success: true };
        } catch (error) {
            await db
                .update(schema.hailpads)
                .set({
                    depthMapStatus: 'failed',
                    status: 'failed'
                })
                .where(eq(schema.hailpads.id, hailpadId));
            console.error(`Error generating depth map for hailpad ID: ${hailpadId}`, error);
            return { success: false, message: (error as Error).message };
        }
    },
    { connection }
);
