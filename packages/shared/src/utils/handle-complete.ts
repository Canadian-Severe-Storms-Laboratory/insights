import { eq } from 'drizzle-orm';
import { db, schema } from '../db';

interface HandleCompleteParams {
    id: string;
    table: 'paths' | 'scans' | 'hailpads';
}

async function checkPathComplete(id: string) {
    await db.transaction(async (tx) => {
        const currentPath = await tx.query.paths.findFirst({
            where: (paths, { eq }) => eq(paths.id, id),
            with: {
                segments: {
                    with: {
                        capture: true,
                        streetView: true
                    }
                }
            }
        });

        if (!currentPath) {
            return;
        }

        // Doesn't need to do anything if already complete or failed
        if (currentPath.status === 'complete' || currentPath.status === 'failed') {
            return;
        }

        const isPathComplete = currentPath.segments.every(
            (segment) =>
                segment.capture.status === 'complete' &&
                segment.panoramaStatus === 'complete' &&
                (segment.streetViewCaptureId ? segment.streetView?.status === 'complete' : true)
        );

        if (isPathComplete) {
            const totalSize = currentPath.segments.reduce((acc, segment) => {
                return acc + (segment.capture.size || 0) + (segment.streetView?.size || 0);
            }, 0);

            await tx
                .update(schema.paths)
                .set({ status: 'complete', size: totalSize })
                .where(eq(schema.paths.id, id));
        }
    });
}

export async function handleComplete(params: HandleCompleteParams) {
    const { id, table } = params;

    try {
        switch (table) {
            case 'paths':
                await checkPathComplete(id);
                break;
            case 'scans':
            case 'hailpads':
                throw new Error(`isComplete not implemented for table: ${table}`);
            default:
                throw new Error(`Unknown table: ${table}`);
        }
    } catch (error) {
        console.error(`Error in handleComplete for ${table} with ID ${id}:`, error);
    }
}
