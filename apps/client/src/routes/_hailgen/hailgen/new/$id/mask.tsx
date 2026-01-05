import { EmptyState } from '@/components/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { useDepthMap } from '@/hooks/use-depth-map';
import { $getPadById } from '@/lib/client';
import { createFileRoute, isRedirect, notFound, redirect } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { lazy, Suspense, useEffect } from 'react';

const MaskEditor = lazy(() => import('@/components/hailgen/mask-editor'));

export const Route = createFileRoute('/_hailgen/hailgen/new/$id/mask')({
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

            if (response.pad.analysisStatus === 'complete') {
                throw redirect({
                    to: '/hailgen/new/$id/depth',
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
    const { data: depthMap, error, refetch } = useDepthMap(queriedHailpad.id);

    useEffect(() => {
        if (
            error instanceof DetailedError &&
            error.statusCode === 400 &&
            queriedHailpad.depthMapStatus !== 'complete' &&
            queriedHailpad.depthMapStatus !== 'failed'
        ) {
            const timer = setTimeout(() => {
                refetch();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [error, refetch, queriedHailpad.depthMapStatus]);

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
            <MaskEditor hailpad={queriedHailpad} depthMap={depthMap} />
        </Suspense>
    );
}
