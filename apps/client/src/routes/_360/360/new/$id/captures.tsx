import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { FileDropZone, type FileState } from '@/components/ui/file-drop-zone';
import { Spinner } from '@/components/ui/spinner';
import { resetPathUpload, uploadCapture } from '@/lib/360/helpers';
import { $getPathByIdAll } from '@/lib/client';
import { parseAxiosError } from '@/lib/errors';
import {
    createFileRoute,
    isRedirect,
    notFound,
    redirect,
    useNavigate,
    useRouter
} from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_360/360/new/$id/captures')({
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

function RouteComponent() {
    const router = useRouter();
    const navigate = useNavigate();
    const pathData = Route.useLoaderData();

    const [isResetting, setIsResetting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [files, setFiles] = useState<File[]>([]);
    const [fileStates, setFileStates] = useState<Record<string, FileState>>({});

    const abortController = new AbortController();
    const handleSetFiles = (newFiles: File[]) => {
        abortController.abort();
        setFiles(newFiles);
    };

    const handleReset = async () => {
        handleSetFiles([]);
        setFileStates({});
        setIsResetting(true);

        try {
            await resetPathUpload(pathData.id);
            router.invalidate();
            toast.success('Captures have been reset.');
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

        const uploadPromises = files.map(async (file, index) => {
            return uploadCapture(pathData.id, file, index, abortController.signal, (event) => {
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
                to: '/360/new/$id/panoramas',
                params: { id: pathData.id }
            });
        } else {
            toast.error('Some files failed to upload. Please check the list.');
        }
    };

    const uploadedCount = pathData.segments.length;
    const hasPreviousUploads = uploadedCount > 0;

    return (
        <div>
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
                <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
                    {isUploading && <Spinner className="mr-2 size-4" />}
                    {isUploading
                        ? 'Uploading...'
                        : `Upload ${files.length} Capture${files.length !== 1 ? 's' : ''}`}
                </Button>

                {hasPreviousUploads && !isUploading && (
                    <div className="flex flex-row items-center gap-4">
                        <p className="text-muted-foreground text-sm font-medium">
                            You have already uploaded {uploadedCount} capture
                            {uploadedCount !== 1 ? 's' : ''}.
                        </p>
                        <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
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
    );
}
