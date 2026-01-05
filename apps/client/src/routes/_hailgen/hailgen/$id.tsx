import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { usePadAll } from '@/hooks/use-hailpad-all';
import { $getPadById } from '@/lib/client';
import { generateHailpadExcelFile } from '@/lib/hailgen/xlsx';
import {
    createFileRoute,
    isNotFound,
    isRedirect,
    notFound,
    redirect
} from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { lazy, Suspense, useState } from 'react';
import { toast } from 'sonner';

const HailpadMap = lazy(() => import('@/components/hailgen/hailpad-map'));
const HailpadDetails = lazy(() => import('@/components/hailgen/hailpad-details'));
const DentDetails = lazy(() => import('@/components/hailgen/dent-details'));

function LoadingComponent() {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center">
            <div className="space-x-2 text-2xl font-bold">
                Loading... <Spinner />
            </div>
        </div>
    );
}

export const Route = createFileRoute('/_hailgen/hailgen/$id')({
    component: RouteComponent,
    loader: async ({ params }) => {
        try {
            const response = await parseResponse(
                $getPadById({
                    param: { id: params.id }
                })
            );

            if (response.pad.status !== 'complete') {
                throw redirect({
                    to: '/hailgen'
                });
            }

            return response.pad;
        } catch (error) {
            if (isRedirect(error) || isNotFound(error)) throw error;

            if (
                error instanceof DetailedError &&
                (error.statusCode === 400 || error.statusCode === 404)
            ) {
                throw notFound();
            }

            console.error('Error fetching pad by ID:', error);
            throw redirect({
                to: '/hailgen/new'
            });
        }
    },
    notFoundComponent: () => (
        <EmptyState title="Hailpad Not Found" description="The requested hailpad does not exist." />
    ),
    errorComponent: ({ error }) => (
        <EmptyState
            title="Error"
            description={
                error instanceof Error
                    ? error.message
                    : 'An unknown error occurred while loading the hailpad.'
            }
        />
    )
});

function RouteComponent() {
    const { id, name } = Route.useLoaderData();
    const { data: pad, filteredData: padFiltered, error, isLoading } = usePadAll(id);

    const [xlsxLoading, setXlsxLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showCentroids, setShowCentroids] = useState(true);
    const [showFittedEllipses, setShowFittedEllipses] = useState(true);

    if (isLoading) {
        return <LoadingComponent />;
    }

    if (error) {
        return (
            <EmptyState
                title="Error"
                description={
                    error instanceof Error
                        ? error.message
                        : 'An unknown error occurred while loading the hailpad data.'
                }
            />
        );
    }

    if (!pad || !padFiltered) {
        return (
            <EmptyState title="No Data" description="No hailpad data is available to display." />
        );
    }

    const dents = padFiltered.dents;

    return (
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-5">
            <Card className="row-span-5 h-min lg:col-span-2">
                <CardHeader>
                    <CardTitle>{name}</CardTitle>
                    <CardDescription>
                        View the interactable hailpad depth map with dent analysis.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<LoadingComponent />}>
                        <HailpadMap
                            padId={id}
                            index={currentIndex}
                            showCentroids={showCentroids}
                            showFittedEllipses={showFittedEllipses}
                            onIndexChange={setCurrentIndex}
                        />
                    </Suspense>
                </CardContent>
            </Card>
            <div className="lg:row-span-3">
                <Suspense fallback={<LoadingComponent />}>
                    <HailpadDetails
                        padId={id}
                        centroids={{
                            value: showCentroids,
                            onChange: setShowCentroids
                        }}
                        fittedEllipses={{
                            value: showFittedEllipses,
                            onChange: setShowFittedEllipses
                        }}
                        downloadLoading={xlsxLoading}
                        handleDownload={() => {
                            setXlsxLoading(true);
                            try {
                                // Generate XLSX of unfiltered dents
                                generateHailpadExcelFile(pad, pad.dents);
                            } catch (error) {
                                console.error('Error generating Excel file:', error);
                                toast.error('Failed to generate Excel file.');
                            } finally {
                                setXlsxLoading(false);
                            }
                        }}
                    />
                </Suspense>
            </div>
            <div className="lg:row-span-2">
                <Suspense fallback={<LoadingComponent />}>
                    <DentDetails
                        padId={id}
                        index={currentIndex}
                        onPrevious={() => {
                            if (currentIndex - 1 >= 0) {
                                setCurrentIndex(currentIndex - 1);
                            } else {
                                setCurrentIndex(dents.length - 1);
                            }
                        }}
                        onNext={() => {
                            if (currentIndex + 1 < dents.length) {
                                setCurrentIndex(currentIndex + 1);
                            } else {
                                setCurrentIndex(0);
                            }
                        }}
                        onIndexChange={setCurrentIndex}
                    />
                </Suspense>
            </div>
        </div>
    );
}
