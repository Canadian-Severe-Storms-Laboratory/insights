import { EmptyState } from '@/components/empty-state';
import { Layout } from '@/components/layout';
import { NewScanButton } from '@/components/lidar/new-scan-button';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_lidar')({
    component: RouteComponent,
    notFoundComponent: () => (
        <EmptyState title="Page Not Found" description="The requested LiDAR page does not exist." />
    ),
    errorComponent: ({ error }) => <EmptyState title="Error" description={String(error)} />
});

function RouteComponent() {
    return (
        <Layout title="LiDAR" action={<NewScanButton />}>
            <Outlet />
        </Layout>
    );
}
