import { $getPadByIdAll } from '@/lib/client';
import { HAILPAD_IMAGE_SIZE } from '@/lib/hailgen/helpers';
import { useQuery } from '@tanstack/react-query';
import { parseResponse } from 'hono/client';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

const fetchPadAll = async (id: string) => {
    const response = await parseResponse(
        await $getPadByIdAll({
            param: { id }
        })
    );

    return response.pad;
};

export type PadAll = Awaited<ReturnType<typeof fetchPadAll>>;

export function padAllQueryKey(padId: string) {
    return ['hailgen', 'pads', padId, 'all'];
}

type FilterState = {
    minMinor: number;
    maxMinor: number;
    minMajor: number;
    maxMajor: number;
};

let filterState: FilterState = {
    minMinor: 0,
    maxMinor: Infinity,
    minMajor: 0,
    maxMajor: Infinity
};

const listeners = new Set<() => void>();

function subscribeToFilter(callback: () => void) {
    listeners.add(callback);
    return () => {
        listeners.delete(callback);
    };
}

function getFilterSnapshot() {
    return filterState;
}

function setFilterState(newState: FilterState | ((prev: FilterState) => FilterState)) {
    filterState = typeof newState === 'function' ? newState(filterState) : newState;
    listeners.forEach(listener => listener());
}

export function usePadAll(padId: string) {
    const filter = useSyncExternalStore(
        subscribeToFilter,
        getFilterSnapshot,
        getFilterSnapshot
    );

    const setFilter = (newState: FilterState | ((prev: FilterState) => FilterState)) => {
        setFilterState(newState);
    };

    const query = useQuery({
        queryKey: padAllQueryKey(padId),
        queryFn: () => fetchPadAll(padId)
    });

    const filteredData = useMemo(() => {
        if (!query.data) return query.data;

        const filteredDents = query.data.dents
            .map((dent) => {
                return {
                    ...dent,
                    majorAxis: String((Number(dent.majorAxis) / HAILPAD_IMAGE_SIZE) * Number(query.data.boxfit)),
                    minorAxis: String((Number(dent.minorAxis) / HAILPAD_IMAGE_SIZE) * Number(query.data.boxfit)),
                    maxDepth: String(Number(dent.maxDepth) * Number(query.data.maxDepth))
                };
            })
            .filter((dent) => {
                const minorAxis = Number(dent.minorAxis);
                const majorAxis = Number(dent.majorAxis);

                return (
                    minorAxis >= filter.minMinor &&
                    minorAxis <= filter.maxMinor &&
                    majorAxis >= filter.minMajor &&
                    majorAxis <= filter.maxMajor
                );
            });

        return {
            ...query.data,
            dents: filteredDents
        };
    }, [query.data, filter]);

    useEffect(() => {
        if (query.data) {
            setFilter((prev) => ({
                ...prev,
                maxMinor: Math.max(...query.data.dents.map((d) => Number(d.minorAxis))),
                maxMajor: Math.max(...query.data.dents.map((d) => Number(d.majorAxis)))
            }));
        }
    }, [query.data]);

    return {
        ...query,
        filteredData,
        filter,
        setFilter
    };
}
