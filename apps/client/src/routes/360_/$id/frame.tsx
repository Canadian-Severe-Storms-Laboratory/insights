import {
    error360Viewer,
    JUMP_SIZE,
    load360ViewerData,
    notFound360Viewer,
    validate360ViewerSearch
} from '@/components/360/viewer-route';
import { ViewerFallback } from '@/components/360/viewer/fallback';
import { use360Viewer } from '@/hooks/use-360-viewer';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const Viewer360 = lazy(() => import('@/components/360/viewer'));

export const Route = createFileRoute('/360_/$id/frame')({
    component: RouteComponent,
    notFoundComponent: notFound360Viewer,
    errorComponent: error360Viewer,
    validateSearch: validate360ViewerSearch,
    loader: load360ViewerData
});

function RouteComponent() {
    const data = use360Viewer(Route);

    if (!data) {
        return null;
    }

    const { path, capture, search, pathProgress, handleIndexChange, handleStateChange } = data;

    return (
        <Suspense fallback={<ViewerFallback />}>
            <Viewer360
                capture={capture}
                captureURL={`${window.location.origin}/api/360/paths/${path.id}/captures/${capture.id}/image`}
                currentState={search.state}
                pathProgress={pathProgress}
                onCurrentStateChange={(state) => handleStateChange(state)}
                onNext={() => handleIndexChange(search.index + 1)}
                onPrevious={() => handleIndexChange(search.index - 1)}
                onJumpNext={() => handleIndexChange(search.index + JUMP_SIZE)}
                onJumpPrevious={() => handleIndexChange(search.index - JUMP_SIZE)}
                className="relative h-screen overflow-hidden"
            />
        </Suspense>
    );
}
