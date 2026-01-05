import { $getPadByIdAll } from '@/lib/client';
import { HAILPAD_IMAGE_SIZE } from '@/lib/hailgen/helpers';
import { useQuery } from '@tanstack/react-query';
import { parseResponse } from 'hono/client';
import { useEffect, useMemo, useState } from 'react';

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

export function usePadAll(padId: string) {
    const [filter, setFilter] = useState({
        minMinor: 0,
        maxMinor: Infinity,
        minMajor: 0,
        maxMajor: Infinity
    });

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
        setFilter((prev) => ({
            ...prev,
            maxMinor: query.data
                ? Math.max(...query.data.dents.map((d) => Number(d.minorAxis)))
                : Infinity,
            maxMajor: query.data
                ? Math.max(...query.data.dents.map((d) => Number(d.majorAxis)))
                : Infinity
        }));
    }, [query.data]);

    return {
        ...query,
        filteredData,
        filter,
        setFilter
    };
}
