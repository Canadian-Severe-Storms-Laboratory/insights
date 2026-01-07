import { EmptyState } from '@/components/empty-state';
import { client } from '@/lib/client';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';

export const Route = createFileRoute('/_lidar/lidar/$id/log')({
    component: RouteComponent,
    errorComponent: ({ error }) => {
        if (error instanceof DetailedError) {
            return <EmptyState title={`Error ${error.code}`} description={error.message} />;
        }

        return <EmptyState title="An unexpected error occurred" description={String(error)} />;
    },
    notFoundComponent: () => {
        return <EmptyState title="Not Found" description="The requested LIDAR scan log was not found." />;
    },
    loader: async ({ params, context }) => {
        const { id } = params;

        if (!context.auth?.data?.user) {
            throw redirect({
                to: '/auth/login',
            });
        }

        return await parseResponse(
            client.api.lidar.scans[':id'].log.$get({
                param: { id }
            })
        );
    }
});

function RouteComponent() {
    const { log } = Route.useLoaderData();

    return <pre className="overflow-auto">{log}</pre>;
}
