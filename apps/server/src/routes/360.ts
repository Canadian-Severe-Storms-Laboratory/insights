import type { AppEnv } from '@/index';
import { auth } from '@/lib/auth';
import { createErrorResponse } from '@/lib/helpers';
import { getImageMetadata } from '@/lib/image';
import { createBodyLimitMiddleware } from '@/lib/middleware';
import { idSchema } from '@/lib/schema';
import { zValidator } from '@hono/zod-validator';
import { db, schema } from '@insights/shared/db';
import { BLUR_QUEUE_NAME, blurQueue, GOOGLE_QUEUE_NAME, googleQueue } from '@insights/shared/queue';
import { deleteFile, getFilePath, handleComplete, saveFile } from '@insights/shared/utils';
import { and, eq, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const bodyLimitMiddleware = createBodyLimitMiddleware(MAX_UPLOAD_SIZE);

const imageFileSchema = z
    .instanceof(File)
    .refine((file) => file.size <= MAX_UPLOAD_SIZE, {
        message: `File size must be less than ${MAX_UPLOAD_SIZE / (1024 * 1024)} MB`
    })
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), {
        message: `File type must be one of: ${ACCEPTED_IMAGE_TYPES.join(', ')}`
    });

const createPathSchema = z.object({
    name: z.string().min(1),
    folderName: z
        .string()
        .min(1)
        .regex(
            /^[a-zA-Z0-9-_]+$/,
            'Folder name can only contain letters, numbers, hyphens, and underscores'
        ),
    eventDate: z.string().transform((date) => new Date(date)),
    captureDate: z.string().transform((date) => new Date(date))
});

const createPathSegmentSchema = z.object({
    index: z.coerce.number().min(0),
    capture: imageFileSchema
});

const createCaptureStreetViewSchema = z.object({
    panoramaId: z.string().min(1),
    capture: imageFileSchema
});

const router = new Hono<AppEnv>()
    .get('/paths', async (c) => {
        const paths = await db.query.paths.findMany({
            where: (paths, { eq }) => eq(paths.hidden, false)
        });
        return c.json({ paths });
    })
    .get('/paths/:id', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const path = await db.query.paths.findFirst({
            where: (paths, { eq, and }) => and(eq(paths.id, params.id), eq(paths.hidden, false))
        });
        if (!path) {
            return c.json(createErrorResponse('Path not found'), 404);
        }
        return c.json({ path });
    })
    .get('/paths/:id/all', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const path = await db.query.paths.findFirst({
            where: (paths, { eq, and }) => and(eq(paths.id, params.id), eq(paths.hidden, false)),
            with: {
                segments: {
                    where: (pathSegments, { eq, and }) => and(eq(pathSegments.hidden, false)),
                    orderBy: (pathSegments, { asc }) => asc(pathSegments.index),
                    with: {
                        capture: true,
                        streetView: true
                    }
                }
            }
        });
        if (!path) {
            return c.json(createErrorResponse('Path not found'), 404);
        }
        return c.json({ path });
    })
    .get('/paths/:id/segments', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const path = await db.query.paths.findFirst({
            where: (paths, { eq, and }) => and(eq(paths.id, params.id), eq(paths.hidden, false))
        });

        if (!path) {
            return c.json(createErrorResponse('Path not found'), 404);
        }

        const segments = await db.query.pathSegments.findMany({
            where: (pathSegments, { eq, and }) =>
                and(eq(pathSegments.pathId, params.id), eq(pathSegments.hidden, false)),
            orderBy: (pathSegments, { asc }) => asc(pathSegments.index),
            with: {
                capture: true,
                streetView: true
            }
        });
        return c.json({ segments });
    })
    .get(
        '/paths/:pathId/captures/:captureId/image',
        zValidator(
            'param',
            z.object({
                pathId: z.uuid(),
                captureId: z.uuid()
            })
        ),
        async (c) => {
            const params = c.req.valid('param');

            const path = await db.query.paths.findFirst({
                where: (paths, { eq, and }) =>
                    and(eq(paths.id, params.pathId), eq(paths.hidden, false))
            });

            if (!path) {
                return c.json(createErrorResponse('Path not found'), 404);
            }

            const capture = await db.query.captures.findFirst({
                where: (captures, { eq }) => eq(captures.id, params.captureId)
            });

            if (!capture) {
                return c.json(createErrorResponse('Capture not found'), 404);
            }

            const fileLocation = getFilePath({
                folderName: path.folderName,
                fileName: capture.fileName,
                type: 'captures'
            });

            const file = Bun.file(fileLocation);

            if (!file.exists()) {
                return c.json(createErrorResponse('Image file not found on disk'), 404);
            }

            return c.body(file.stream(), {
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                    'Content-Length': String(file.size)
                }
            });
        }
    )
    .get('/captures/:id', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const capture = await db.query.captures.findFirst({
            where: (captures, { eq }) => eq(captures.id, params.id)
        });
        if (!capture) {
            return c.json(createErrorResponse('Capture not found'), 404);
        }
        return c.json({ capture });
    })
    .get('/captures/:id/segments', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const capture = await db.query.captures.findFirst({
            where: (captures, { eq }) => eq(captures.id, params.id)
        });
        if (!capture) {
            return c.json(createErrorResponse('Capture not found'), 404);
        }
        const segments = await db.query.pathSegments.findMany({
            where: (pathSegments, { eq, and, or }) =>
                and(
                    or(
                        eq(pathSegments.captureId, params.id),
                        eq(pathSegments.streetViewCaptureId, params.id)
                    ),
                    eq(pathSegments.hidden, false)
                ),
            orderBy: (pathSegments, { asc }) => asc(pathSegments.index)
        });
        return c.json({ segments });
    })
    .use(async (c, next) => {
        const session = await auth.api.getSession(c.req.raw);

        // If no valid session, return 401
        if (!session || !session.user) {
            return c.json(createErrorResponse('Unauthorized'), 401);
        }

        // Proceed to the next middleware/handler
        await next();
    })
    .post('/paths', zValidator('form', createPathSchema), async (c) => {
        const data = c.req.valid('form');
        const user = c.get('user');

        if (!user) {
            return c.json(createErrorResponse('Unauthorized'), 401);
        }

        // Check if the folderName is already used
        const existingPath = await db.query.paths.findFirst({
            where: (paths, { eq }) => eq(paths.folderName, data.folderName)
        });

        if (existingPath) {
            return c.json(createErrorResponse('Folder name already in use'), 400);
        }

        const newPaths = await db
            .insert(schema.paths)
            .values({
                name: data.name,
                folderName: data.folderName,
                status: 'in_progress',
                eventDate: data.eventDate,
                captureDate: data.captureDate,
                createdBy: user.id,
                updatedBy: user.id
            })
            .returning();

        const newPath = newPaths[0];

        if (newPaths.length === 0 || !newPath) {
            return c.json(createErrorResponse('Failed to create path'), 500);
        }

        return c.json({ path: newPath });
    })
    .post('/paths/:id/hide', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');

        const user = c.get('user');
        if (!user) {
            return c.json(createErrorResponse('Unauthorized'), 401);
        }

        const path = await db.query.paths.findFirst({
            where: (paths, { eq }) => eq(paths.id, params.id)
        });

        if (!path) {
            return c.json(createErrorResponse('Path not found'), 404);
        }

        await db
            .update(schema.paths)
            .set({
                hidden: true,
                updatedBy: user.id
            })
            .where(eq(schema.paths.id, params.id));

        return c.json({ id: params.id, hidden: true });
    })
    .post(
        '/paths/:id/captures',
        bodyLimitMiddleware,
        zValidator('param', idSchema),
        zValidator('form', createPathSegmentSchema),
        async (c) => {
            const params = c.req.valid('param');
            const data = c.req.valid('form');

            const path = await db.query.paths.findFirst({
                where: (paths, { eq }) => eq(paths.id, params.id)
            });

            if (!path) {
                return c.json(createErrorResponse('Path not found'), 404);
            }

            // Check if the segment index is already used for this path
            const existingSegment = await db.query.pathSegments.findFirst({
                where: (pathSegments, { eq, and }) =>
                    and(eq(pathSegments.pathId, params.id), eq(pathSegments.index, data.index))
            });

            if (existingSegment) {
                return c.json(
                    createErrorResponse('Segment index already in use for this path'),
                    400
                );
            }

            // Get the image metadata
            const imageMeta = await getImageMetadata(data.capture);

            // If there is no GPS data, return an error
            if (!imageMeta || !imageMeta.latitude || !imageMeta.longitude || !imageMeta.heading) {
                return c.json(createErrorResponse('Image is missing required GPS metadata'), 400);
            }

            // Check if the date taken is valid
            if (imageMeta.takenAt && isNaN(imageMeta.takenAt.getTime())) {
                return c.json(createErrorResponse('Image has invalid taken date metadata'), 400);
            }

            // Ensure the aspect ratio is approximately 2:1 for 360 images
            if (imageMeta.aspectRatio) {
                const ratioDiff = Math.abs(imageMeta.aspectRatio - 2);
                if (ratioDiff > 0.2) {
                    return c.json(
                        createErrorResponse('Image aspect ratio is not suitable for 360 images'),
                        400
                    );
                }
            }

            const fileName = `segment_${data.index}_${data.capture.name}`;

            const saveResult = await saveFile({
                file: data.capture,
                folderName: path.folderName,
                fileName: fileName,
                type: 'captures'
            });

            if (!saveResult.success) {
                return c.json(
                    createErrorResponse(saveResult.error || 'Failed to upload file'),
                    500
                );
            }

            const deleteFileOnError = saveResult.deleteCallback;

            try {
                const newCaptures = await db
                    .insert(schema.captures)
                    .values({
                        fileName: fileName,
                        source: 'cssl',
                        size: data.capture.size,
                        takenAt: imageMeta.takenAt || new Date(),
                        uploadedAt: new Date(),
                        status: 'pending',
                        lng: String(imageMeta.longitude),
                        lat: String(imageMeta.latitude),
                        altitude: imageMeta.altitude ? String(imageMeta.altitude) : null,
                        heading: String(imageMeta.heading),
                        pitch: imageMeta.pitch ? String(imageMeta.pitch) : null,
                        roll: imageMeta.roll ? String(imageMeta.roll) : null
                    })
                    .returning();

                const newCapture = newCaptures[0];

                if (newCaptures.length === 0 || !newCapture) {
                    await deleteFileOnError();
                    return c.json(createErrorResponse('Failed to create capture record'), 500);
                }

                const newSegments = await db
                    .insert(schema.pathSegments)
                    .values({
                        index: data.index,
                        pathId: params.id,
                        captureId: newCapture.id,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        hidden: false
                    })
                    .returning();

                const newSegment = newSegments[0];

                if (newSegments.length === 0 || !newSegment) {
                    await deleteFileOnError();
                    return c.json(createErrorResponse('Failed to create segment record'), 500);
                }

                await Promise.all([
                    googleQueue.add(GOOGLE_QUEUE_NAME, {
                        segmentId: newSegment.id
                    }),
                    blurQueue.add(BLUR_QUEUE_NAME, {
                        captureId: newCapture.id
                    })
                ]);

                return c.json({ segment: newSegment });
            } catch (error) {
                console.error(`[${path.id}][${data.index}] Error creating database records`, error);
                await deleteFileOnError();
                return c.json(createErrorResponse('Failed to create segment'), 500);
            }
        }
    )
    .post(
        '/paths/:id/captures/street-view',
        bodyLimitMiddleware,
        zValidator('param', idSchema),
        zValidator('form', createCaptureStreetViewSchema),
        async (c) => {
            const params = c.req.valid('param');
            const data = c.req.valid('form');

            const path = await db.query.paths.findFirst({
                where: (paths, { eq, and }) => and(eq(paths.id, params.id), eq(paths.hidden, false))
            });

            if (!path) {
                return c.json(createErrorResponse('Path not found'), 404);
            }

            const panorama = await db.query.panoramas.findFirst({
                where: (panoramas, { eq }) => eq(panoramas.id, data.panoramaId)
            });

            if (!panorama) {
                return c.json(createErrorResponse('Panorama not found'), 404);
            }

            const segment = await db.query.pathSegments.findFirst({
                where: (pathSegments, { eq, and }) =>
                    and(
                        eq(pathSegments.pathId, params.id),
                        eq(pathSegments.panoramaId, panorama.id)
                    )
            });

            if (!segment) {
                return c.json(createErrorResponse('No path segment for this panorama'), 404);
            }

            const fileName = `street-view_${data.capture.name}`;

            const saveResult = await saveFile({
                file: data.capture,
                folderName: path.folderName,
                fileName: fileName,
                type: 'captures'
            });

            if (!saveResult.success) {
                return c.json(
                    createErrorResponse(saveResult.error || 'Failed to upload file'),
                    500
                );
            }

            const deleteFileOnError = saveResult.deleteCallback;

            try {
                const newCaptures = await db
                    .insert(schema.captures)
                    .values({
                        fileName: fileName,
                        source: 'google',
                        size: data.capture.size,
                        takenAt: panorama.date || new Date(),
                        uploadedAt: new Date(),
                        status: 'complete', // Street view captures are always complete
                        lng: String(panorama.lon),
                        lat: String(panorama.lat),
                        altitude: panorama.elevation ? String(panorama.elevation) : null,
                        heading: String(panorama.heading),
                        pitch: panorama.pitch ? String(panorama.pitch) : null,
                        roll: panorama.roll ? String(panorama.roll) : null
                    })
                    .returning();

                const newCapture = newCaptures[0];

                if (newCaptures.length === 0 || !newCapture) {
                    await deleteFileOnError();
                    return c.json(createErrorResponse('Failed to create capture record'), 500);
                }

                const captureId = newCapture.id;

                await db
                    .update(schema.pathSegments)
                    .set({
                        streetViewCaptureId: captureId
                    })
                    .where(
                        and(
                            eq(schema.pathSegments.pathId, params.id),
                            eq(schema.pathSegments.panoramaId, panorama.id)
                        )
                    );

                await handleComplete({ id: path.id, table: 'paths' });

                return c.json({ captureId });
            } catch (error) {
                console.error(
                    `[${path.id}][${panorama.id}] Error creating database records`,
                    error
                );
                await deleteFileOnError();
                return c.json(createErrorResponse('Failed to create street view capture'), 500);
            }
        }
    )
    .post('/paths/:id/reset', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const user = c.get('user');

        if (!user) {
            return c.json(createErrorResponse('Unauthorized'), 401);
        }

        // Only able to reset paths that are not completed
        const path = await db.query.paths.findFirst({
            where: (paths, { eq, and, ne }) =>
                and(eq(paths.id, params.id), ne(paths.status, 'complete')),
            with: {
                segments: {
                    with: {
                        capture: true,
                        streetView: true
                    }
                }
            }
        });

        if (!path) {
            return c.json(createErrorResponse('Path not found'), 404);
        }

        const filesToDelete = await db.transaction(async (tx) => {
            const files: {
                fileName: string;
                folderName: string;
                type: 'captures';
            }[] = [];

            const deletedSegments = await tx
                .delete(schema.pathSegments)
                .where(eq(schema.pathSegments.pathId, params.id))
                .returning();

            for (const segment of deletedSegments) {
                const deletedCaptures = await tx
                    .delete(schema.captures)
                    .where(
                        or(
                            eq(schema.captures.id, segment.captureId),
                            segment.streetViewCaptureId
                                ? eq(schema.captures.id, segment.streetViewCaptureId)
                                : undefined
                        )
                    )
                    .returning();

                for (const capture of deletedCaptures) {
                    files.push({
                        fileName: capture.fileName,
                        folderName: path.folderName,
                        type: 'captures'
                    });
                }
            }

            await tx
                .update(schema.paths)
                .set({
                    status: 'in_progress',
                    updatedBy: user.id
                })
                .where(eq(schema.paths.id, params.id));

            return files;
        });

        for (const file of filesToDelete) {
            await deleteFile(file);
        }

        return c.json({ id: params.id, status: 'in_progress' });
    })
    .get('/paths/:id/status/street-view', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');

        const path = await db.query.paths.findFirst({
            where: (paths, { eq, and }) => and(eq(paths.id, params.id), eq(paths.hidden, false))
        });

        if (!path) {
            return c.json(createErrorResponse('Path not found'), 404);
        }

        const segments = await db.query.pathSegments.findMany({
            where: (pathSegments, { eq, and }) =>
                and(eq(pathSegments.pathId, params.id), eq(pathSegments.hidden, false)),
            orderBy: (pathSegments, { asc }) => asc(pathSegments.index),
            with: {
                panorama: true
            }
        });

        const statusList = segments.map((segment) => ({
            segmentId: segment.id,
            checkedPanorama: segment.panoramaStatus,
            hasPanorama: !!segment.panorama,
            panoramaId: segment.panoramaId
        }));

        return c.json({ status: statusList });
    });

export default router;
