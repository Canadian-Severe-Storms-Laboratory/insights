import { CardGrid } from '@/components/card-grid';
import { EmptyState } from '@/components/empty-state';
import { FilterMenu } from '@/components/filter-menu';
import { CardFilter } from '@/lib/filter'
import { useAuth } from '@/providers/auth-provider';
import { PadCard } from '@/components/hailgen/pad-card';
import { Spinner } from '@/components/ui/spinner';
import { $getAllPads, type Pad } from '@/lib/client';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { EyeOff } from 'lucide-react';

import { useStore } from '@/lib/stores/filter-settings';
import { useShallow } from 'zustand/react/shallow';

const fetchAllPads = parseResponse($getAllPads());

function getUserId () {

    const auth = useAuth()
    if (auth.isAuthenticated && auth.data)
    { return auth.data.user.id }
    else { return '' };
}

export const Route = createFileRoute('/_hailgen/hailgen/')({
    component: RouteComponent
});

function RouteComponent() {

    const userId = getUserId();

    const { searchString, startDate, endDate, uploader } = useStore(
        useShallow((state) => ({
                searchString: state.searchString,
                startDate: state.startDate,
                endDate: state.endDate,
                uploader: state.uploader
        })
    ))

    const filterValues = {
        searchString: searchString,
        startDate: startDate,
        endDate: endDate,
        uploader: uploader
    }

    const { data, error, isLoading } = useQuery({
        queryKey: ['hailgen-pads'],
        queryFn: () => fetchAllPads
    });

    const filteredData = CardFilter( data?.pads || [], filterValues, userId) as Pad[];
    
    if (isLoading) {
        return <EmptyState title="Loading..." description="" icon={<Spinner />} />;
    }

    if (error) {
        return (
            <EmptyState
                title="Error"
                icon={<EyeOff />}
                description={error instanceof DetailedError ? error.message : String(error)}
            />
        );
    }

    if (data?.pads.length === 0) {
        return (
            <EmptyState
                title="No Hailpads Found"
                description="There are no hailpads available at the moment."
            />
        );
    }

    return (
        <div className="flex gap-4">
            <div className="w-sd flex basis-2xs flex-col items-start">
                <FilterMenu />
            </div>
            <div className = "grow">
            <CardGrid
                items={filteredData || []}
                renderCard={(pad) => <PadCard pad={pad} />}
                emptyState={
                    <EmptyState
                        title="No Hailpads Found"
                        description="There are no hailpads available at the moment."
                    />
                }
            />
            </div>
        </div>
    );
}
