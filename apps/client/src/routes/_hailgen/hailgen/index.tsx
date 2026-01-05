import { CardGrid } from '@/components/card-grid';
import { EmptyState } from '@/components/empty-state';
import { PadCard } from '@/components/hailgen/pad-card';
import { Spinner } from '@/components/ui/spinner';
import { $getAllPads } from '@/lib/client';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { EyeOff } from 'lucide-react';

const fetchAllPads = parseResponse($getAllPads());

export const Route = createFileRoute('/_hailgen/hailgen/')({
    component: RouteComponent
});

function RouteComponent() {
    const { data, error, isLoading } = useQuery({
        queryKey: ['hailgen-pads'],
        queryFn: () => fetchAllPads
    });

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
        <CardGrid
            items={data?.pads || []}
            renderCard={(pad) => <PadCard pad={pad} />}
            emptyState={
                <EmptyState
                    title="No Hailpads Found"
                    description="There are no hailpads available at the moment."
                />
            }
        />
    );
}
