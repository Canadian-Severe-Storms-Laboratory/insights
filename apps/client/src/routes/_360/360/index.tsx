import { PathCard } from '@/components/360/path-card';
import { CardGrid } from '@/components/card-grid';
import { EmptyState } from '@/components/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { $getAllPaths } from '@/lib/client';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { EyeOff } from 'lucide-react';

const fetchAllPaths = parseResponse($getAllPaths());

export const Route = createFileRoute('/_360/360/')({
    component: RouteComponent
});

function RouteComponent() {
    const { data, error, isLoading } = useQuery({
        queryKey: ['360-paths'],
        queryFn: () => fetchAllPaths
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

    if (data?.paths.length === 0) {
        return (
            <EmptyState
                title="No Paths Found"
                description="There are no paths available at the moment."
            />
        );
    }

    return (
        <CardGrid
            items={data?.paths || []}
            renderCard={(path) => <PathCard path={path} />}
            emptyState={
                <EmptyState
                    title="No Paths Found"
                    description="There are no paths available at the moment."
                />
            }
        />
    );
}
