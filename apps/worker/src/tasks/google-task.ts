import { getStreetViewImage } from '@/lib/google';
import { db, schema } from '@insights/shared/db';
import {
    connection,
    GOOGLE_QUEUE_NAME,
    type GoogleTaskData,
    type GoogleTaskResult
} from '@insights/shared/queue';
import { handleComplete } from '@insights/shared/utils';
import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

export const googleWorker = new Worker<GoogleTaskData, GoogleTaskResult>(
    GOOGLE_QUEUE_NAME,
    async (job) => {
        const { segmentId } = job.data;
        try {
            const segment = await db.query.pathSegments.findFirst({
                where: (pathSegments, { eq, and }) =>
                    and(eq(pathSegments.id, segmentId), eq(pathSegments.hidden, false)),
                with: {
                    capture: true,
                    panorama: true
                }
            });

            if (!segment) {
                return { success: false, message: 'Segment not found' };
            }

            if (segment.panoramaStatus === 'complete') {
                return { success: true };
            }

            await db
                .update(schema.pathSegments)
                .set({
                    panoramaStatus: 'in_progress'
                })
                .where(eq(schema.pathSegments.id, segment.id));

            const panorama = await getStreetViewImage({
                lat: Number(segment.capture.lat),
                lng: Number(segment.capture.lng)
            });

            if (!panorama) {
                await db
                    .update(schema.pathSegments)
                    .set({
                        panoramaStatus: 'complete'
                    })
                    .where(eq(schema.pathSegments.id, segment.id));
                return {
                    success: true,
                    message: 'No panorama available for this location'
                };
            }

            await db.transaction(async (tx) => {
                await tx
                    .insert(schema.panoramas)
                    .values({
                        id: panorama.id,
                        lat: String(panorama.lat),
                        lon: String(panorama.lon),
                        date: panorama.date,
                        heading: String(panorama.heading),
                        pitch: panorama.pitch ? String(panorama.pitch) : null,
                        elevation: panorama.elevation ? String(panorama.elevation) : null,
                        roll: panorama.roll ? String(panorama.roll) : null
                    })
                    .onConflictDoUpdate({
                        target: schema.panoramas.id,
                        set: {
                            lat: String(panorama.lat),
                            lon: String(panorama.lon),
                            date: panorama.date,
                            heading: String(panorama.heading),
                            pitch: panorama.pitch ? String(panorama.pitch) : null,
                            elevation: panorama.elevation ? String(panorama.elevation) : null,
                            roll: panorama.roll ? String(panorama.roll) : null
                        }
                    });

                await tx
                    .update(schema.pathSegments)
                    .set({
                        panoramaId: panorama.id,
                        panoramaStatus: 'complete'
                    })
                    .where(eq(schema.pathSegments.id, segment.id));
            });

            await handleComplete({ id: segment.pathId, table: 'paths' });

            return { success: true };
        } catch (error) {
            try {
                await db
                    .update(schema.pathSegments)
                    .set({
                        panoramaStatus: 'failed'
                    })
                    .where(eq(schema.pathSegments.id, segmentId));
            } catch (updateError) {
                console.error('Error updating panoramaStatus to failed:', updateError);
            }

            console.error('Error processing Google task:', error);
            return { success: false, message: (error as Error).message };
        }
    },
    {
        name: 'google',
        limiter: {
            // 2 jobs per second
            max: 4,
            duration: 1000
        },
        concurrency: 2,
        connection
    }
);
