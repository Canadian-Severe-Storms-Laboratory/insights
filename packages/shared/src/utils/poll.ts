const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PollOptions<T> = {
    url: string;
    validate: (data: T) => boolean;
    fetchOptions?: RequestInit;
    intervalMs?: number;
    timeoutMs?: number;
};

export async function pollForResult<T>({
    url,
    validate,
    fetchOptions,
    intervalMs = 10 * 1000,
    timeoutMs = 10 * 60 * 1000
}: PollOptions<T>): Promise<T> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await fetch(url, fetchOptions);

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            // Parse and validate the response
            const data = (await response.json()) as T;
            const isComplete = validate(data);

            if (isComplete) {
                return data;
            }

            console.log('Job not ready, retrying...');
        } catch (err) {
            console.warn('Polling attempt failed:', err);
        }

        await delay(intervalMs);
    }

    throw new Error('Polling timed out');
}
