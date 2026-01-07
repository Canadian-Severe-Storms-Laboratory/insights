import { EmptyState } from '@/components/empty-state';
import { $getScanById } from '@/lib/client';
import { isNotFound, isRedirect, notFound, redirect } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';

export function notFoundLidarViewer(): React.ReactNode {
    return <EmptyState title="Scan Not Found" description="The requested scan does not exist." />;
}

export function errorLidarViewer({ error }: { error: unknown }): React.ReactNode {
    return (
        <EmptyState
            title="Error"
            description={
                error instanceof Error
                    ? error.message
                    : 'An unknown error occurred while loading the scan.'
            }
        />
    );
}

export async function loadLidarViewerData({ params }: { params: { id: string } }) {
    try {
        const response = await parseResponse(
            $getScanById({
                param: { id: params.id }
            })
        );

        if (response.scan.status !== 'complete') {
            throw redirect({
                to: '/lidar'
            });
        }

        return response.scan;
    } catch (error) {
        if (isRedirect(error) || isNotFound(error)) throw error;

        if (
            error instanceof DetailedError &&
            (error.statusCode === 400 || error.statusCode === 404)
        ) {
            throw notFound();
        }

        console.error('Error fetching scan by ID:', error);
        throw redirect({
            to: '/lidar/new'
        });
    }
}
