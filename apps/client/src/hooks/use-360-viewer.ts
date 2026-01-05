import type { PathProgress } from '@/components/360/viewer';
import { JUMP_SIZE } from '@/components/360/viewer-route';
import type { GetPathByIdAll } from '@/lib/client';
import { useCallback, useEffect } from 'react';

export function use360Viewer(route: {
    useLoaderData: () => Exclude<GetPathByIdAll, { error: unknown }>['path'];
    useSearch: () => { index: number; state: 'before' | 'after' };
    useNavigate: () => (options: { search: { index: number; state: 'before' | 'after' } }) => void;
}) {
    const path = route.useLoaderData();
    const search = route.useSearch();
    const navigate = route.useNavigate();

    const segment = path.segments[search.index];

    if (!segment) {
        return null;
    }

    const capture =
        search.state === 'before' ? segment.streetView || segment.capture : segment.capture;

    const pathProgress: PathProgress = {
        hasBefore: Boolean(segment.streetView),
        hasNext: search.index < path.segments.length - 1,
        hasPrevious: search.index > 0,
        hasNextJump: search.index + JUMP_SIZE < path.segments.length,
        hasPreviousJump: search.index - JUMP_SIZE >= 0
    };

    const handleIndexChange = (index: number) => {
        const clampedIndex = Math.max(0, Math.min(index, path.segments.length - 1));
        navigate({
            search: {
                index: clampedIndex,
                state: search.state
            }
        });
    };

    const handleStateChange = useCallback(
        (state: 'before' | 'after') => {
            navigate({
                search: {
                    index: search.index,
                    state: state
                }
            });
        },
        [navigate, search.index]
    );

    useEffect(() => {
        // If the current state is before and there is no before capture, switch to after
        if (search.state === 'before' && !segment.streetView) {
            handleStateChange('after');
        }
    }, [search.index, search.state, segment.streetView, handleStateChange]);

    return {
        path,
        search,
        capture,
        pathProgress,
        handleIndexChange,
        handleStateChange
    };
}
