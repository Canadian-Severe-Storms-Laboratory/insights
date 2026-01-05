import { Fallback } from '@/components/fallback';
import { Options } from '@/components/lidar/viewer-options';
import {
    errorLidarViewer,
    loadLidarViewerData,
    notFoundLidarViewer
} from '@/components/lidar/viewer-route';
import { viewerSettingsSchema } from '@/components/lidar/viewer/schema';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const Renderer = lazy(() => import('@/components/lidar/viewer'));

export const Route = createFileRoute('/_lidar/lidar/$id/')({
    component: RouteComponent,
    loader: loadLidarViewerData,
    errorComponent: errorLidarViewer,
    notFoundComponent: notFoundLidarViewer
});

function RouteComponent() {
    const data = Route.useLoaderData();
    const viewerSettings = viewerSettingsSchema.parse(data.viewerSettings);

    return (
        <main className="flex flex-col justify-between gap-2 lg:flex-row">
            <div className="h-[300px] w-full min-w-0 lg:h-[500px] 2xl:h-[750px]">
                <Suspense fallback={<Fallback />}>
                    <Renderer
                        url={`${window.location.origin}/api/lidar/scans/${data.id}/point-cloud/output/`}
                        initialTransform={viewerSettings}
                        debug={true}
                    />
                </Suspense>
            </div>
            <Options className="lg:min-w-96" />
        </main>
    );
}
