import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { FileDropZone, type FileState } from '@/components/ui/file-drop-zone';
import { Spinner } from '@/components/ui/spinner';
import { resetPathUpload, uploadPanorama } from '@/lib/360/helpers';
import { $getPathByIdAll, $getPathStreetViewStatus } from '@/lib/client';
import { parseAxiosError } from '@/lib/errors';
import { useQuery } from '@tanstack/react-query';
import {
    createFileRoute,
    isRedirect,
    notFound,
    redirect,
    useNavigate
} from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { CheckIcon, RefreshCw, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_360/360/new/$id/panoramas')({
    component: RouteComponent,
    notFoundComponent: () => (
        <EmptyState title="Path Not Found" description="The requested path does not exist." />
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
                $getPathByIdAll({
                    param: { id: params.id }
                })
            );

            if (response.path.status !== 'in_progress') {
                throw redirect({
                    to: `/360/$id`,
                    params: { id: params.id },
                    search: {
                        index: 0,
                        state: 'after'
                    }
                });
            }

            const hasUploads = response.path.segments.some((segment) => segment.captureId !== null);
            if (!hasUploads) {
                throw redirect({
                    to: '/360/new/$id/captures',
                    params: { id: params.id }
                });
            }

            return response.path;
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
                to: '/360/new'
            });
        }
    }
});

const fetchAllPaths = (id: string) =>
    parseResponse(
        $getPathStreetViewStatus({
            param: { id }
        })
    );

function RouteComponent() {
    const navigate = useNavigate();
    const pathData = Route.useLoaderData();
    const { id } = Route.useParams();

    const [isResetting, setIsResetting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [files, setFiles] = useState<File[]>([]);
    const [fileStates, setFileStates] = useState<Record<string, FileState>>({});

    const abortController = new AbortController();
    const handleSetFiles = (newFiles: File[]) => {
        abortController.abort();
        setFiles(newFiles);
    };

    const { data, error, isLoading, refetch } = useQuery({
        queryKey: ['360-path-street-view-status', id],
        queryFn: () => fetchAllPaths(id)
    });

    const handleReset = async () => {
        handleSetFiles([]);
        setFileStates({});
        setIsResetting(true);

        try {
            await resetPathUpload(pathData.id);
            navigate({
                to: '/360/new/$id/captures',
                params: { id: pathData.id }
            });
        } catch (error) {
            console.error('Error resetting captures:', error);
            toast.error('Failed to reset captures. Please try again.');
        } finally {
            setIsResetting(false);
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);

        const initialStates = files.reduce(
            (acc, file) => ({
                ...acc,
                [file.name]: { progress: 0 }
            }),
            {}
        );
        setFileStates(initialStates);

        const uploadPromises = files.map(async (file) => {
            return uploadPanorama(pathData.id, file, abortController.signal, (event) => {
                if (event.total) {
                    const progress = Math.round((event.loaded * 100) / event.total);
                    setFileStates((prev) => ({
                        ...prev,
                        [file.name]: { ...prev[file.name], progress }
                    }));
                }
            }).catch((error) => {
                setFileStates((prev) => ({
                    ...prev,
                    [file.name]: {
                        progress: 0,
                        error: parseAxiosError(error) || 'Upload failed'
                    }
                }));
                return 'FAILED';
            });
        });

        const results = await Promise.all(uploadPromises);
        const hasErrors = results.includes('FAILED');

        setIsUploading(false);

        if (!hasErrors) {
            toast.success('All files uploaded successfully');
            navigate({
                to: '/360/$id',
                params: { id: pathData.id },
                search: {
                    index: 0,
                    state: 'after'
                }
            });
        } else {
            toast.error('Some files failed to upload. Please check the list.');
        }
    };

    const allReady =
        data?.status.every(
            (p) => p.checkedPanorama === 'complete' || p.checkedPanorama === 'failed'
        ) || false;
    const uniquePanoramas = new Set(
        data?.status.filter((p) => p.hasPanorama).map((p) => p.panoramaId) || []
    );
    const requiredUploads = uniquePanoramas.size;
    const uploadedCount = pathData.segments.filter((segment) => segment.streetViewCaptureId).length;
    const hasPreviousUploads = uploadedCount > 0;

    const handleCopy = () => {
        if (!data) return;
        const segmentIds = [...uniquePanoramas].join('\n');
        navigator.clipboard.writeText(segmentIds).then(
            () => {
                toast.success('Segment IDs copied to clipboard!');
            },
            (err) => {
                console.error('Could not copy text: ', err);
                toast.error('Failed to copy segment IDs.');
            }
        );
    };

    useEffect(() => {
        // Refetch every 10 seconds if not all panoramas are ready
        if (!allReady) {
            const interval = setInterval(() => {
                refetch();
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [allReady, refetch]);

    return (
        <div>
            <div className="my-4">
                <h2 className="mb-2 font-semibold">Instructions</h2>
                <p>
                    Please ensure that all segments have been processed and are showing a{' '}
                    <span>
                        <CheckIcon className="inline h-6 w-6 text-green-500" />
                    </span>{' '}
                    or an{' '}
                    <span>
                        <XIcon className="inline h-6 w-6 text-red-500" />
                    </span>
                    . Once all segments are ready, you can copy the IDs of the segments that have
                    panoramas available. Upload them below to proceed.
                </p>
            </div>
            <div className="py-4">
                <h2 className="mb-2 font-semibold">Panorama Availability Status</h2>
                {isLoading && <p>Loading panorama status...</p>}
                {error && <p className="text-red-500">Error loading panorama status.</p>}
                {data && (
                    <div className="bg-muted/20 flex flex-wrap gap-4 rounded-md border p-4">
                        {data.status.map((segment, index) => {
                            const checkStatus =
                                segment.checkedPanorama === 'complete' ||
                                segment.checkedPanorama === 'failed'
                                    ? 'ready'
                                    : 'pending';
                            const panoramaStatus = segment.hasPanorama
                                ? 'available'
                                : 'unavailable';

                            return (
                                <div
                                    key={segment.segmentId}
                                    className="flex w-24 flex-col items-center"
                                >
                                    <div
                                        className={`flex h-12 w-12 items-center justify-center rounded-md border ${
                                            checkStatus === 'ready'
                                                ? panoramaStatus === 'available'
                                                    ? 'border-green-500 bg-green-100'
                                                    : 'border-red-500 bg-red-100'
                                                : 'border-gray-500 bg-gray-100'
                                        }`}
                                    >
                                        {checkStatus === 'ready' ? (
                                            panoramaStatus === 'available' ? (
                                                <span className="text-2xl text-green-500">
                                                    <CheckIcon />
                                                </span>
                                            ) : (
                                                <span className="text-2xl text-red-500">
                                                    <XIcon />
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-2xl text-gray-500">
                                                <Spinner />
                                            </span>
                                        )}
                                    </div>
                                    <span className="mt-1 text-center">Segment {index + 1}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                <Button className="mt-4" onClick={handleCopy} disabled={!allReady}>
                    Copy {requiredUploads} IDs to Clipboard
                </Button>
            </div>
            <div className="mb-6">
                <FileDropZone
                    files={files}
                    setFiles={handleSetFiles}
                    fileStates={fileStates}
                    acceptedFileTypes={['image/jpg', 'image/jpeg', 'image/png']}
                    onReset={() => {
                        setFileStates({});
                    }}
                />
                <div className="mt-4 flex flex-row items-center justify-between">
                    <Button
                        onClick={handleUpload}
                        disabled={files.length !== requiredUploads || isUploading}
                    >
                        {isUploading && <Spinner className="mr-2 size-4" />}
                        {isUploading
                            ? 'Uploading...'
                            : `Upload ${files.length}/${requiredUploads} Panorama${files.length !== 1 ? 's' : ''}`}
                    </Button>

                    {hasPreviousUploads && !isUploading && (
                        <div className="flex flex-row items-center gap-4">
                            <p className="text-muted-foreground text-sm font-medium">
                                You have already uploaded {uploadedCount} capture
                                {uploadedCount !== 1 ? 's' : ''}.
                            </p>
                            <Button
                                variant="destructive"
                                onClick={handleReset}
                                disabled={isResetting}
                            >
                                {isResetting ? (
                                    <>
                                        <Spinner className="mr-2 size-4" />
                                        Resetting...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 size-4" />
                                        Reset Captures
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
