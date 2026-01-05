import { FramePicker } from '@/components/360/frame-picker';
import {
    error360Viewer,
    JUMP_SIZE,
    load360ViewerData,
    notFound360Viewer,
    validate360ViewerSearch
} from '@/components/360/viewer-route';
import { ViewerFallback } from '@/components/360/viewer/fallback';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { use360Viewer } from '@/hooks/use-360-viewer';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const Viewer360 = lazy(() => import('@/components/360/viewer'));

export const Route = createFileRoute('/_360/360/$id')({
    component: RouteComponent,
    notFoundComponent: notFound360Viewer,
    errorComponent: error360Viewer,
    validateSearch: validate360ViewerSearch,
    loader: load360ViewerData
});

function CaptureDetail({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p>{value}</p>
        </div>
    );
}

function RouteComponent() {
    const data = use360Viewer(Route);

    if (!data) {
        return null;
    }

    const { path, capture, search, pathProgress, handleIndexChange, handleStateChange } = data;

    return (
        <div className="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-2">
            <div className="bg-card text-card-foreground row-span-2 rounded-lg border p-6 shadow-sm lg:col-span-2">
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
                        // Scale based on the height of the card
                        className="relative h-full min-h-96 overflow-hidden rounded-md"
                    />
                </Suspense>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Capture Details</CardTitle>
                    <CardDescription>About the current 360 view.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <CaptureDetail
                        label="Event date"
                        value={new Intl.DateTimeFormat('en-CA', { dateStyle: 'long' }).format(
                            new Date(path.eventDate)
                        )}
                    />
                    <CaptureDetail
                        label="Capture date"
                        value={new Intl.DateTimeFormat('en-CA', { dateStyle: 'long' }).format(
                            new Date(capture.takenAt)
                        )}
                    />
                    <CaptureDetail
                        label="Location"
                        value={`${Number(capture.lat).toFixed(4)}, ${Number(capture.lng).toFixed(4)}`}
                    />
                    <CaptureDetail
                        label="Altitude"
                        value={
                            capture.altitude ? `${Number(capture.altitude).toFixed(2)} m` : 'N/A'
                        }
                    />
                    <CaptureDetail
                        label="Size"
                        value={`${(capture.size / 1024 / 1024).toFixed(2)} MB`}
                    />
                </CardContent>
                <CardFooter>
                    <FramePicker
                        index={search.index + 1}
                        length={path.segments.length}
                        onJump={(index) => handleIndexChange(index)}
                    />
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Path Overview</CardTitle>
                    <CardDescription>
                        View the entire path and your current viewing position.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-64 w-full overflow-hidden rounded-md">
                        {/* <Suspense fallback={<Skeleton />}>
                            <PathMap
                                segments={data.path.segments}
                                onSegmentClick={(index) => {
                                    navigate({
                                        search: `?index=${index}&state=${data.path.currentState}`
                                    });
                                }}
                                currentSegment={data.path.segments[data.path.index]}
                                token={data.ENV.MAPBOX_KEY}
                            />
                        </Suspense> */}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
