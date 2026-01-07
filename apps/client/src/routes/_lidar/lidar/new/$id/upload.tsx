import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { FileDropZone, type FileState } from '@/components/ui/file-drop-zone';
import { Spinner } from '@/components/ui/spinner';
import { $getScanById } from '@/lib/client';
import { parseAxiosError } from '@/lib/errors';
import { uploadScan } from '@/lib/lidar/helpers';
import {
    createFileRoute,
    isRedirect,
    notFound,
    redirect,
    useNavigate
} from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_lidar/lidar/new/$id/upload')({
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
                $getScanById({
                    param: { id: params.id }
                })
            );

            if (response.scan.status !== 'pending' && response.scan.status !== 'failed') {
                throw redirect({
                    to: `/lidar/$id`,
                    params: { id: params.id }
                });
            }

            return response.scan;
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
                to: '/lidar/new'
            });
        }
    }
});

function RouteComponent() {
    const navigate = useNavigate();
    const pathData = Route.useLoaderData();
    const [isUploading, setIsUploading] = useState(false);

    const [files, setFiles] = useState<File[]>([]);
    const [fileStates, setFileStates] = useState<Record<string, FileState>>({});
    const abortController = new AbortController();
    const handleSetFiles = (newFiles: File[]) => {
        abortController.abort();
        setFiles(newFiles);
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
            return uploadScan(pathData.id, file, abortController.signal, (event) => {
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
                to: '/lidar/$id',
                params: { id: pathData.id }
            });
        } else {
            toast.error('Some files failed to upload. Please check the list.');
        }
    };

    return (
        <div>
            <FileDropZone
                files={files}
                setFiles={handleSetFiles}
                fileStates={fileStates}
                acceptedFileTypes={['.las', '.laz']}
                onReset={() => {
                    setFileStates({});
                }}
                multiple={false}
            />
            <div className="mt-4 flex flex-row items-center justify-between">
                <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
                    {isUploading && <Spinner className="mr-2 size-4" />}
                    {isUploading ? 'Uploading...' : `Upload scan`}
                </Button>
            </div>
        </div>
    );
}
