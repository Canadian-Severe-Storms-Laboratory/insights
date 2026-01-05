import { bodyLimit } from 'hono/body-limit';
import { createErrorResponse } from './helpers';

function formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

export function createBodyLimitMiddleware(maxSize: number) {
    return bodyLimit({
        maxSize: maxSize,
        onError: (c) => {
            console.log('Body limit exceeded');
            return c.json(
                createErrorResponse(
                    `Request body is too large. Max size is ${formatBytes(maxSize)}.`
                ),
                413
            );
        }
    });
}
