import { $getPadDepthMapById } from '@/lib/client';
import { useQuery } from '@tanstack/react-query';
import { DetailedError } from 'hono/client';

const fetchDepthMap = async (id: string) => {
    const response = await $getPadDepthMapById({
        param: { id }
    });

    if (!response.ok) {
        throw new DetailedError('Failed to fetch depth map', {
            statusCode: response.status
        });
    }

    const blob = await response.blob();
    return createImageBitmap(blob);
};

export function depthMapQueryKey(padId: string) {
    return ['hailgen', 'pads', padId, 'depth-map'];
}

export function useDepthMap(padId: string) {
    return useQuery({
        queryKey: depthMapQueryKey(padId),
        queryFn: () => fetchDepthMap(padId)
    });
}
