import { client, createAxiosPostFormHandler } from '@/lib/client';
import type { AxiosProgressEvent } from 'axios';

export async function resetPathUpload(id: string) {
    const res = await client.api[360].paths[':id'].reset.$post({
        param: { id }
    });
    if (!res.ok) throw new Error('Failed to reset captures');
}

export async function uploadCapture(
    pathId: string,
    file: File,
    index: number,
    signal: AbortSignal,
    onProgress: (e: AxiosProgressEvent) => void
) {
    const formData = new FormData();
    formData.append('index', String(index));
    formData.append('capture', file);

    return createAxiosPostFormHandler(client.api[360].paths[':id'].captures, {
        param: { id: pathId },
        formData,
        signal,
        onUploadProgress: onProgress
    });
}

export async function uploadPanorama(
    pathId: string,
    file: File,
    signal: AbortSignal,
    onProgress: (e: AxiosProgressEvent) => void
) {
    const panoramaId = file.name.split('.')[0];

    if (!panoramaId) {
        throw new Error('Invalid file name. Panorama ID is missing.');
    }

    const formData = new FormData();
    formData.append('capture', file);
    formData.append('panoramaId', panoramaId);

    return createAxiosPostFormHandler(client.api[360].paths[':id'].captures['street-view'], {
        param: { id: pathId },
        formData,
        signal,
        onUploadProgress: onProgress
    });
}
