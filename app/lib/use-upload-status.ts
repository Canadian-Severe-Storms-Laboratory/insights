import { useEventSource } from 'remix-utils/sse/react';

export const useUploadStatus = <T>(id: string) => {
	const progressStream = useEventSource(`/hailgen/new/${id}/progress`, {
		event: id.toString()
	});

	if (progressStream) {
		try {
			const event = JSON.parse(progressStream) as T;
			return { success: true, event } as const;
		} catch (cause) {
			return { success: false };
		}
	}
};
