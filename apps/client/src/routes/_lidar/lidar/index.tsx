import { CardGrid } from '@/components/card-grid';
import { EmptyState } from '@/components/empty-state';
import { ScanCard } from '@/components/lidar/scan-card';
import { Spinner } from '@/components/ui/spinner';
import { $getAllScans } from '@/lib/client';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { EyeOff } from 'lucide-react';

const fetchAllScans = parseResponse($getAllScans());

export const Route = createFileRoute('/_lidar/lidar/')({
    component: RouteComponent
});

function RouteComponent() {
    const { data, error, isLoading } = useQuery({
        queryKey: ['lidar-scans'],
        queryFn: () => fetchAllScans
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

    if (data?.scans.length === 0) {
        return (
            <EmptyState
                title="No Scans Found"
                description="There are no scans available at the moment."
            />
        );
    }

    return (
        <CardGrid
            items={data?.scans || []}
            renderCard={(scan) => <ScanCard scan={scan} />}
            emptyState={
                <EmptyState
                    title="No Scans Found"
                    description="There are no scans available at the moment."
                />
            }
        />
    );
}
