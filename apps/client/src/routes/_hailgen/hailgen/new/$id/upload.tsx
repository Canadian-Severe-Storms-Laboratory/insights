import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { FileDropZone, type FileState } from '@/components/ui/file-drop-zone';
import { Spinner } from '@/components/ui/spinner';
import { depthMapQueryKey } from '@/hooks/use-depth-map';
import { $getPadById } from '@/lib/client';
import { parseAxiosError } from '@/lib/errors';
import { uploadHailpad } from '@/lib/hailgen/helpers';
import { useQueryClient } from '@tanstack/react-query';
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

export const Route = createFileRoute('/_hailgen/hailgen/new/$id/upload')({
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
    const navigate = useNavigate();
    const pathData = Route.useLoaderData();
    const queryClient = useQueryClient();
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
            return uploadHailpad(pathData.id, file, abortController.signal, (event) => {
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

        await queryClient.invalidateQueries({
            queryKey: depthMapQueryKey(pathData.id)
        });

        if (!hasErrors) {
            toast.success('All files uploaded successfully');
            await navigate({
                to: '/hailgen/new/$id/mask',
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
                acceptedFileTypes={['.stl']}
                onReset={() => {
                    setFileStates({});
                }}
                multiple={false}
            />
            <div className="mt-4 flex flex-row items-center justify-between">
                <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
                    {isUploading && <Spinner className="mr-2 size-4" />}
                    {isUploading ? 'Uploading...' : `Upload hailpad`}
                </Button>
            </div>
        </div>
    );
}
