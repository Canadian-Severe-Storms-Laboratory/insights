import type { AppEnv } from '@/index';
import { auth } from '@/lib/auth';
import { createErrorResponse, parseRangeHeader } from '@/lib/helpers';
import { dateStringSchema, folderNameSchema, idSchema } from '@/lib/schema';
import { zValidator } from '@hono/zod-validator';
import { db, schema } from '@insights/shared/db';
import { POINT_CLOUD_QUEUE_NAME, pointCloudQueue } from '@insights/shared/queue';
import { getFileDirectory, saveFile } from '@insights/shared/utils';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB

const bodyLimitMiddleware = bodyLimit({
    maxSize: MAX_UPLOAD_SIZE + 1024 * 1024,
    onError: (c) => {
        console.log('Body limit exceeded');
        return c.json(
            createErrorResponse(
                `Request body is too large. Max size is ${MAX_UPLOAD_SIZE / (1024 * 1024 * 1024)} GB`
            ),
            413
        );
    }
});

const createScanSchema = z.object({
    name: z.string().min(1),
    folderName: folderNameSchema,
    eventDate: dateStringSchema,
    captureDate: dateStringSchema
});

const pointCloudRequestSchema = z.object({
    file: z
        .instanceof(File)
        .refine((file) => file.name.endsWith('.las') || file.name.endsWith('.laz'), {
            message: 'File must be a .las or .laz'
        })
});

const router = new Hono<AppEnv>()
    .get('/scans', async (c) => {
        const scans = await db.query.scans.findMany({
            where: (scans, { eq }) => eq(scans.hidden, false)
        });
        return c.json({ scans });
    })
    .get('/scans/:id', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const scan = await db.query.scans.findFirst({
            where: (scans, { eq, and }) => and(eq(scans.id, params.id), eq(scans.hidden, false))
        });
        if (!scan) {
            return c.json(createErrorResponse('Scan not found'), 404);
        }
        return c.json({ scan });
    })
    .get('/scans/:id/log', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const scan = await db.query.scans.findFirst({
            where: (scans, { eq, and }) => and(eq(scans.id, params.id), eq(scans.hidden, false))
        });
        if (!scan) {
            return c.json(createErrorResponse('Scan not found'), 404);
        }

        const logPath = `${getFileDirectory({
            folderName: scan.folderName,
            type: 'scans'
        })}/output/potree_conversion.log`;

        try {
            const file = Bun.file(logPath);
            if (!(await file.exists())) {
                return c.json(createErrorResponse('Log file not found'), 404);
            }
            const logContent = await file.text();
            return c.json({ log: logContent });
        } catch (error) {
            console.error(`[${scan.folderName}] Error retrieving log file`, error);
            return c.json(createErrorResponse('Error retrieving log file'), 500);
        }
    })
    .get(
        '/scans/:id/point-cloud/output/:fileName',
        zValidator('param', idSchema.extend({ fileName: z.string().min(1) })),
        async (c) => {
            const params = c.req.valid('param');
            const range = c.req.header('Range');

            const scan = await db.query.scans.findFirst({
                where: (scans, { eq, and }) => and(eq(scans.id, params.id), eq(scans.hidden, false))
            });
            if (!scan) {
                return c.json(createErrorResponse('Scan not found'), 404);
            }

            // Get the file path from the wildcard
            const directory = getFileDirectory({
                folderName: scan.folderName,
                type: 'scans'
            });
            const fullPath = `${directory}/output/${params.fileName}`;
            const file = Bun.file(fullPath);

            if (!(await file.exists())) {
                return c.json(createErrorResponse('File not found'), 404);
            }

            if (!range) {
                return new Response(file.stream(), {
                    status: 200,
                    headers: {
                        'Content-Length': file.size.toString(),
                        'Content-Type': 'application/octet-stream',
                        'Accept-Ranges': 'bytes'
                    }
                });
            }

            const totalSize = file.size;

            const ranges = parseRangeHeader(range, totalSize);
            if (!ranges) {
                return c.json(createErrorResponse('Invalid Range header'), 416);
            }

            if (ranges.length === 1) {
                const { start, end } = ranges[0]!;
                const chunkSize = end - start + 1;
                const chunk = file.slice(start, end + 1);

                return new Response(chunk, {
                    status: 206,
                    headers: {
                        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunkSize.toString(),
                        'Content-Type': 'application/octet-stream'
                    }
                });
            }

            return c.json(createErrorResponse('Multiple ranges not supported'), 416);
        }
    )
    .use(async (c, next) => {
        const session = await auth.api.getSession(c.req.raw);

        // If no valid session, return 401
        if (!session || !session.user) {
            return c.json(createErrorResponse('Unauthorized'), 401);
        }

        // Proceed to the next middleware/handler
        await next();
    })
    .post('/scans/:id/hide', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const scan = await db.query.scans.findFirst({
            where: (scans, { eq, and }) => and(eq(scans.id, params.id), eq(scans.hidden, false))
        });
        if (!scan) {
            return c.json(createErrorResponse('Scan not found'), 404);
        }

        await db.update(schema.scans).set({ hidden: true }).where(eq(schema.scans.id, params.id));

        return c.json({ success: true });
    })
    .post('/scans', zValidator('form', createScanSchema), async (c) => {
        const formData = c.req.valid('form');
        const user = c.get('user');

        if (!user) {
            return c.json(createErrorResponse('Unauthorized'), 401);
        }

        const nameScan = await db.query.scans.findFirst({
            where: (scans, { eq, and }) => and(eq(scans.name, formData.name))
        });

        if (nameScan) {
            return c.json(createErrorResponse('A scan with this name already exists'), 400);
        }

        const folderNameScan = await db.query.scans.findFirst({
            where: (scans, { eq, and }) => and(eq(scans.folderName, formData.folderName))
        });

        if (folderNameScan) {
            return c.json(createErrorResponse('A scan with this folder name already exists'), 400);
        }

        const newScans = await db
            .insert(schema.scans)
            .values({
                name: formData.name,
                folderName: formData.folderName,
                eventDate: new Date(formData.eventDate),
                captureDate: new Date(formData.captureDate),
                createdBy: user.id,
                updatedBy: user.id,
                status: 'pending'
            })
            .returning();

        const newScan = newScans[0];

        if (newScans.length === 0 || !newScan) {
            return c.json({ error: 'Failed to create scan' }, 500);
        }

        return c.json({ scan: newScan });
    })
    .post(
        '/scans/:id/point-cloud',
        bodyLimitMiddleware,
        zValidator('param', idSchema),
        zValidator('form', pointCloudRequestSchema),
        async (c) => {
            const user = c.get('user');

            if (!user) {
                return c.json(createErrorResponse('Unauthorized'), 401);
            }

            const params = c.req.valid('param');
            const formData = c.req.valid('form');

            const scan = await db.query.scans.findFirst({
                where: (scans, { eq, and }) => and(eq(scans.id, params.id), eq(scans.hidden, false))
            });

            if (!scan) {
                return c.json(createErrorResponse('Scan not found'), 404);
            }

            const fileType = formData.file.name.endsWith('.laz') ? 'laz' : 'las';
            const fileName = `scan.${fileType}`;

            const saveResult = await saveFile({
                file: formData.file,
                folderName: scan.folderName,
                fileName,
                type: 'scans'
            });

            if (!saveResult.success) {
                return c.json(createErrorResponse(saveResult.error), 500);
            }

            try {
                await db
                    .update(schema.scans)
                    .set({
                        size: formData.file.size,
                        updatedBy: user.id
                    })
                    .where(eq(schema.scans.id, params.id));

                await pointCloudQueue.add(POINT_CLOUD_QUEUE_NAME, {
                    scanId: scan.id,
                    scanFileName: fileName
                });
            } catch (error) {
                await saveResult.deleteCallback();
                console.error(`[${scan.folderName}] Error processing point cloud upload`, error);
                return c.json(createErrorResponse('Error processing point cloud'), 500);
            }

            return c.json({ success: true });
        }
    );

export default router;
