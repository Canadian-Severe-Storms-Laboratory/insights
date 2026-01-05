import { EmptyState } from '@/components/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { useDepthMap } from '@/hooks/use-depth-map';
import { $getPadById } from '@/lib/client';
import { createFileRoute, isRedirect, notFound, redirect } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { lazy, Suspense } from 'react';

const DepthMapViewer = lazy(() => import('@/components/hailgen/depth-viewer'));

export const Route = createFileRoute('/_hailgen/hailgen/new/$id/depth')({
    component: RouteComponent,
    notFoundComponent: () => (
        <EmptyState title="Hailpad Not Found" description="The requested pad does not exist." />
    ),
    errorComponent: ({ error }) => (
        <EmptyState
            title="Error"
            description={error instanceof Error ? error.message : String(error)}
        />
    ),
    beforeLoad: async ({ context }) => {
        if (!context.auth?.isAuthenticated) {
            throw redirect({
                to: '/auth/login'
            });
        }
    },
    loader: async ({ params }) => {
        try {
            const response = await parseResponse(
                $getPadById({
                    param: { id: params.id }
                })
            );

            if (response.pad.status === 'complete') {
                throw redirect({
                    to: '/hailgen/$id',
                    params: { id: params.id }
                });
            }

            if (response.pad.depthMapStatus !== 'complete') {
                throw redirect({
                    to: '/hailgen/new/$id/mask',
                    params: { id: params.id }
                });
            }

            return response.pad;
        } catch (error) {
            if (isRedirect(error)) throw error;

            if (
                error instanceof DetailedError &&
                (error.statusCode === 400 || error.statusCode === 404)
            ) {
                throw notFound();
            }

            console.error('Error fetching path by ID:', error);
            throw redirect({
                to: '/hailgen/new'
            });
        }
    }
});

function RouteComponent() {
    const queriedHailpad = Route.useLoaderData();
    const { data: depthMap, error } = useDepthMap(queriedHailpad.id);

    if (error) {
        return <EmptyState title="Error Loading Depth Map" description={error.message} />;
    }

    return (
        <Suspense
            fallback={
                <EmptyState
                    title="Loading Mask Editor..."
                    description="Please wait while the mask editor loads."
                    icon={<Spinner />}
                />
            }
        >
            <DepthMapViewer
                hailpad={queriedHailpad}
                depthMap={depthMap}
            />
        </Suspense>
    );
}
