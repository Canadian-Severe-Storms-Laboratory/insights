import { client, createAxiosPostFormHandler } from '@/lib/client';
import type { AxiosProgressEvent } from 'axios';

export const HAILPAD_IMAGE_SIZE = 1000;

export async function uploadHailpad(
    padId: string,
    file: File,
    signal: AbortSignal,
    onProgress: (e: AxiosProgressEvent) => void
) {
    const formData = new FormData();
    formData.append('postHit', file);

    return createAxiosPostFormHandler(client.api.hailgen.pads[':id'].scan, {
        param: { id: padId },
        formData,
        signal,
        onUploadProgress: onProgress
    });
}
