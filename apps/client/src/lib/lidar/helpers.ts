import type { AxiosProgressEvent } from "axios";
import { client, createAxiosPostFormHandler } from "../client";

export async function uploadScan(
    scanId: string,
    file: File,
    signal: AbortSignal,
    onProgress: (e: AxiosProgressEvent) => void
) {
    const formData = new FormData();
    formData.append('file', file);

    return createAxiosPostFormHandler(client.api.lidar.scans[':id']["point-cloud"], {
        param: { id: scanId },
        formData,
        signal,
        onUploadProgress: onProgress
    });
}