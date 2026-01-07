import axios from 'axios';

export function parseAxiosError(error: unknown): string | null {
    if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data as { error?: { message: string } };
        if (data.error && data.error.message) {
            return data.error.message;
        }
    }
    return null;
}
