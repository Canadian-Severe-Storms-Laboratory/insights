import type { AppEnv } from '@/index';
import { auth } from '@/lib/auth';
import { createErrorResponse } from '@/lib/helpers';
import { findMinMaxLocations } from '@/lib/image';
import { createBodyLimitMiddleware } from '@/lib/middleware';
import { folderNameSchema, idSchema } from '@/lib/schema';
import { zValidator } from '@hono/zod-validator';
import { db, schema } from '@insights/shared/db';
import {
    DEPTH_MAP_QUEUE_NAME,
    depthMapQueue,
    HAILPAD_ANALYSIS_QUEUE_NAME,
    hailpadAnalysisQueue
} from '@insights/shared/queue';
import { getFilePath, saveFile } from '@insights/shared/utils';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

const HAILPAD_IMAGE_SIZE = 1000;

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
const ACCEPTED_MODEL_FILE_TYPES = ['model/stl', 'application/sla', 'application/vnd.ms-pki.stl']; // STL file types
const ACCEPTED_IMAGE_FILE_TYPES = ['image/png']; // PNG file types

const bodyLimitMiddleware = createBodyLimitMiddleware(MAX_UPLOAD_SIZE);

const createPadSchema = z.object({
    name: z.string().min(3).max(255),
    folderName: folderNameSchema,
    boxfit: z.coerce.number().min(0)
});

const createPadScanSchema = z.object({
    postHit: z
        .file()
        .refine((file) => file.size > 0, {
            message: 'File is empty'
        })
        .refine((file) => ACCEPTED_MODEL_FILE_TYPES.includes(file.type), {
            message: `File type must be one of: ${ACCEPTED_MODEL_FILE_TYPES.join(', ')}`
        })
});

const updateMaskSchema = z.object({
    mask: z
        .file()
        .refine((file) => file.size > 0, {
            message: 'File is empty'
        })
        .refine((file) => ACCEPTED_IMAGE_FILE_TYPES.includes(file.type), {
            message: `File type must be one of: ${ACCEPTED_IMAGE_FILE_TYPES.join(', ')}`
        })
});

const dentSchema = z.object({
    dentId: z.string().min(1, {
        message: 'Dent ID is required'
    })
});

const dentAxisSchema = z.object({
    minorAxis: z.coerce.number().min(0, {
        error: 'Minor axis must be at least 0'
    }),
    majorAxis: z.coerce.number().min(0, {
        error: 'Major axis must be at least 0'
    })
});

const updatePadSchema = z.union([
    z.object({
        action: z.literal('boxfit'),
        boxfit: z.coerce.number().min(0)
    }),
    z.object({
        action: z.literal('maxDepth'),
        maxDepth: z.coerce.number().min(0)
    }),
    z
        .object({
            action: z.literal('deleteDent')
        })
        .extend(dentSchema.shape),
    z
        .object({
            action: z.literal('dentAxis')
        })
        .extend(dentSchema.shape)
        .extend(dentAxisSchema.shape),
    z
        .object({
            action: z.literal('newDent'),
            centroidX: z.coerce.number().min(0, {
                error: 'Centroid X must be at least 0'
            }),
            centroidY: z.coerce.number().min(0, {
                error: 'Centroid Y must be at least 0'
            }),
            maxDepth: z.coerce.number().min(0, {
                error: 'Max depth must be at least 0'
            }),
            angle: z.coerce.number().optional()
        })
        .extend(dentAxisSchema.shape)
]);

const router = new Hono<AppEnv>()
    .get('/pads', async (c) => {
        const pads = await db.query.hailpads.findMany({
            where: (pad, { eq }) => eq(pad.hidden, false)
        });

        return c.json({ pads });
    })
    .get('/pads/:id', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const pad = await db.query.hailpads.findFirst({
            where: (pad, { eq, and }) => and(eq(pad.id, params.id), eq(pad.hidden, false))
        });
        if (!pad) {
            return c.json(createErrorResponse('Hailpad not found'), 404);
        }
        return c.json({ pad });
    })
    .get('/pads/:id/all', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const pad = await db.query.hailpads.findFirst({
            where: (pad, { eq, and }) => and(eq(pad.id, params.id), eq(pad.hidden, false)),
            with: {
                dents: true
            }
        });
        if (!pad) {
            return c.json(createErrorResponse('Hailpad not found'), 404);
        }
        return c.json({ pad });
    })
    .get('/pads/:id/depth-map', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const pad = await db.query.hailpads.findFirst({
            where: (pad, { eq, and }) => and(eq(pad.id, params.id), eq(pad.hidden, false))
        });
        if (!pad) {
            return c.json(createErrorResponse('Hailpad not found'), 404);
        }
        if (pad.depthMapStatus !== 'complete') {
            return c.json(createErrorResponse('Depth map not ready'), 400);
        }

        const filePath = getFilePath({
            folderName: pad.folderName,
            fileName: 'depth_map.png',
            type: 'hailpads'
        });
        const file = Bun.file(filePath);
        if (!file || !(await file.exists())) {
            return c.json(createErrorResponse('Depth map file not found'), 404);
        }
        return c.body(file.stream(), {
            headers: {
                'Content-Type': 'image/png',
                'Content-Length': String(file.size)
            }
        });
    })
    .get('/pads/:id/dents', zValidator('param', idSchema), async (c) => {
        const params = c.req.valid('param');
        const pad = await db.query.hailpads.findFirst({
            where: (pad, { eq, and }) => and(eq(pad.id, params.id), eq(pad.hidden, false))
        });
        if (!pad) {
            return c.json(createErrorResponse('Hailpad not found'), 404);
        }
        const dents = await db.query.dents.findMany({
            where: (dent, { eq }) => eq(dent.hailpadId, params.id)
        });
        return c.json({ dents });
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
    .post('/pads', zValidator('form', createPadSchema), async (c) => {
        const formData = c.req.valid('form');
        const user = c.get('user');

        if (!user) {
            return c.json(createErrorResponse('Unauthorized'), 401);
        }

        // Check for existing folder name
        const existingPad = await db.query.hailpads.findFirst({
            where: (pad, { eq }) => eq(pad.folderName, formData.folderName)
        });
        if (existingPad) {
            return c.json(
                createErrorResponse('Folder name already exists. Please choose another one.'),
                400
            );
        }

        const newPads = await db
            .insert(schema.hailpads)
            .values({
                name: formData.name,
                folderName: formData.folderName,
                boxfit: Number(formData.boxfit).toString(),
                updatedBy: user.id,
                createdBy: user.id
            })
            .returning();

        const newPad = newPads[0];

        if (!newPad) {
            return c.json(createErrorResponse('Failed to create Hailpad'), 500);
        }

        return c.json({ pad: newPad });
    })
    .post(
        '/pads/:id/scan',
        bodyLimitMiddleware,
        zValidator('param', idSchema),
        zValidator('form', createPadScanSchema),
        async (c) => {
            const params = c.req.valid('param');
            const formData = c.req.valid('form');
            const user = c.get('user');

            if (!user) {
                return c.json(createErrorResponse('Unauthorized'), 401);
            }

            const pad = await db.query.hailpads.findFirst({
                where: (pad, { eq, and }) => and(eq(pad.id, params.id), eq(pad.hidden, false))
            });
            if (!pad) {
                return c.json(createErrorResponse('Hailpad not found'), 404);
            }

            const saveResult = await saveFile({
                file: formData.postHit,
                folderName: pad.folderName,
                fileName: `post_hit.stl`,
                type: 'hailpads'
            });

            if (!saveResult.success) {
                return c.json(createErrorResponse('Failed to upload scan file'), 500);
            }

            const deleteFileOnError = saveResult.deleteCallback;

            try {
                await depthMapQueue.add(DEPTH_MAP_QUEUE_NAME, {
                    hailpadId: pad.id
                });
                await db
                    .update(schema.hailpads)
                    .set({
                        status: 'in_progress',
                        analysisStatus: 'pending',
                        depthMapStatus: 'processing'
                    })
                    .where(eq(schema.hailpads.id, pad.id));
                return c.json({ message: 'Scan files uploaded and processing started' });
            } catch (error) {
                console.error(`[${pad.id}] Error enqueuing scan processing:`, error);
                await deleteFileOnError();
                return c.json(createErrorResponse('Failed to process scan file'), 500);
            }
        }
    )
    .post(
        '/pads/:id/mask',
        bodyLimitMiddleware,
        zValidator('param', idSchema),
        zValidator('form', updateMaskSchema),
        async (c) => {
            const params = c.req.valid('param');
            const formData = c.req.valid('form');
            const user = c.get('user');

            if (!user) {
                return c.json(createErrorResponse('Unauthorized'), 401);
            }

            const pad = await db.query.hailpads.findFirst({
                where: (pad, { eq, and }) => and(eq(pad.id, params.id), eq(pad.hidden, false))
            });
            if (!pad) {
                return c.json(createErrorResponse('Hailpad not found'), 404);
            }

            const saveResult = await saveFile({
                file: formData.mask,
                folderName: pad.folderName,
                fileName: `mask.png`,
                type: 'hailpads'
            });

            if (!saveResult.success) {
                return c.json(createErrorResponse('Failed to upload mask file'), 500);
            }

            const deleteFileOnError = saveResult.deleteCallback;

            // Load the file into memory and create a CV mat
            const filePath = getFilePath({
                folderName: pad.folderName,
                fileName: 'mask.png',
                type: 'hailpads'
            });

            try {
                const { maxLoc } = await findMinMaxLocations(filePath);

                await db
                    .update(schema.hailpads)
                    .set({
                        maxDepthLocationX: Number(maxLoc.x),
                        maxDepthLocationY: Number(maxLoc.y),
                        updatedBy: user.id
                    })
                    .where(eq(schema.hailpads.id, pad.id));
            } catch (error) {
                if (error instanceof Error) {
                    console.error(`[${pad.id}] Error finding min/max locations:`, error.message);
                } else {
                    console.error(`[${pad.id}] Unknown error finding min/max locations:`, error);
                }
                await deleteFileOnError();
                return c.json(createErrorResponse('Failed to process mask file'), 500);
            }

            try {
                await hailpadAnalysisQueue.add(HAILPAD_ANALYSIS_QUEUE_NAME, {
                    hailpadId: pad.id
                });
                await db
                    .update(schema.hailpads)
                    .set({
                        analysisStatus: 'pending'
                    })
                    .where(eq(schema.hailpads.id, pad.id));
                return c.json({ message: 'Mask file uploaded and analysis started' });
            } catch (error) {
                console.error(`[${pad.id}] Error enqueuing hailpad analysis:`, error);
                await deleteFileOnError();
                return c.json(createErrorResponse('Failed to start hailpad analysis'), 500);
            }
        }
    )
    .post(
        '/pads/:id/update',
        bodyLimitMiddleware,
        zValidator('param', idSchema),
        zValidator('form', updatePadSchema, (result, c) => {
            if (!result.success) {
                return c.json(createErrorResponse(result.error.message), 400);
            }
        }),
        async (c) => {
            const params = c.req.valid('param');
            const formData = c.req.valid('form');
            const user = c.get('user');

            if (!user) {
                return c.json(createErrorResponse('Unauthorized'), 401);
            }

            const pad = await db.query.hailpads.findFirst({
                where: (pad, { eq, and }) => and(eq(pad.id, params.id), eq(pad.hidden, false))
            });
            if (!pad) {
                return c.json(createErrorResponse('Hailpad not found'), 404);
            }

            const boxfit = Number(pad.boxfit);
            const maxDepth = Number(pad.maxDepth);

            if (isNaN(boxfit) || boxfit <= 0) {
                return c.json(createErrorResponse('Invalid boxfit value for hailpad'), 500);
            }

            if (isNaN(maxDepth) || maxDepth < 0) {
                return c.json(createErrorResponse('Invalid max depth value for hailpad'), 500);
            }

            switch (formData.action) {
                case 'boxfit':
                    try {
                        await db.transaction(async (tx) => {
                            const pads = await tx
                                .update(schema.hailpads)
                                .set({
                                    boxfit: Number(formData.boxfit).toString(),
                                    updatedBy: user.id
                                })
                                .where(eq(schema.hailpads.id, pad.id))
                                .returning();

                            if (pads.length === 0) {
                                throw new Error('Failed to update boxfit');
                            }

                            const updatedPad = pads[0]!;

                            // Update status if analysis and depth map are complete
                            if (
                                updatedPad.analysisStatus === 'complete' &&
                                updatedPad.depthMapStatus === 'complete' &&
                                updatedPad.status !== 'complete' &&
                                updatedPad.status !== 'failed'
                            ) {
                                await tx
                                    .update(schema.hailpads)
                                    .set({
                                        status: 'complete'
                                    })
                                    .where(eq(schema.hailpads.id, pad.id));
                            }
                        });

                        return c.json({ message: 'Boxfit updated successfully' });
                    } catch (error) {
                        console.error(`[${pad.id}] Error updating boxfit:`, error);
                        return c.json(createErrorResponse('Failed to update boxfit'), 500);
                    }
                case 'maxDepth':
                    try {
                        await db.transaction(async (tx) => {
                            const pads = await tx
                                .update(schema.hailpads)
                                .set({
                                    maxDepth: Number(formData.maxDepth).toString(),
                                    updatedBy: user.id
                                })
                                .where(eq(schema.hailpads.id, pad.id))
                                .returning();

                            if (pads.length === 0) {
                                throw new Error('Failed to update boxfit');
                            }

                            const updatedPad = pads[0]!;

                            // Update status if analysis and depth map are complete
                            if (
                                updatedPad.analysisStatus === 'complete' &&
                                updatedPad.depthMapStatus === 'complete' &&
                                updatedPad.status !== 'complete' &&
                                updatedPad.status !== 'failed'
                            ) {
                                await tx
                                    .update(schema.hailpads)
                                    .set({
                                        status: 'complete'
                                    })
                                    .where(eq(schema.hailpads.id, pad.id));
                            }
                        });
                        return c.json({ message: 'Max depth updated successfully' });
                    } catch (error) {
                        console.error(`[${pad.id}] Error updating max depth:`, error);
                        return c.json(createErrorResponse('Failed to update max depth'), 500);
                    }
                case 'deleteDent':
                    try {
                        const deleteCount = await db
                            .delete(schema.dents)
                            .where(
                                and(
                                    eq(schema.dents.id, formData.dentId),
                                    eq(schema.dents.hailpadId, pad.id)
                                )
                            )
                            .returning();

                        if (deleteCount.length === 0) {
                            return c.json(createErrorResponse('Dent not found'), 404);
                        }

                        return c.json({ message: 'Dent deleted successfully' });
                    } catch (error) {
                        console.error(`[${pad.id}] Error deleting dent:`, error);
                        return c.json(createErrorResponse('Failed to delete dent'), 500);
                    }
                case 'dentAxis':
                    try {
                        await db
                            .update(schema.dents)
                            .set({
                                minorAxis: String(
                                    (formData.minorAxis * HAILPAD_IMAGE_SIZE) / boxfit
                                ),
                                majorAxis: String(
                                    (formData.majorAxis * HAILPAD_IMAGE_SIZE) / boxfit
                                )
                            })
                            .where(
                                and(
                                    eq(schema.dents.id, formData.dentId),
                                    eq(schema.dents.hailpadId, pad.id)
                                )
                            );
                        return c.json({ message: 'Dent axes updated successfully' });
                    } catch (error) {
                        console.error(`[${pad.id}] Error updating dent axes:`, error);
                        return c.json(createErrorResponse('Failed to update dent axes'), 500);
                    }
                case 'newDent':
                    try {
                        const newDents = await db
                            .insert(schema.dents)
                            .values({
                                hailpadId: pad.id,
                                minorAxis: String(
                                    (formData.minorAxis * HAILPAD_IMAGE_SIZE) / boxfit
                                ),
                                majorAxis: String(
                                    (formData.majorAxis * HAILPAD_IMAGE_SIZE) / boxfit
                                ),
                                centroidX: String(formData.centroidX),
                                centroidY: String(formData.centroidY),
                                maxDepth: String(formData.maxDepth / maxDepth),
                                angle: formData.angle ? String(formData.angle) : null
                            })
                            .returning();

                        if (newDents.length === 0) {
                            return c.json(createErrorResponse('Failed to create new dent'), 500);
                        }

                        return c.json({
                            message: 'New dent created successfully',
                            dent: newDents[0]
                        });
                    } catch (error) {
                        console.error(`[${pad.id}] Error creating new dent:`, error);
                        return c.json(createErrorResponse('Failed to create new dent'), 500);
                    }
                default:
                    return c.json(createErrorResponse('Invalid action'), 400);
            }
        }
    );

export default router;
