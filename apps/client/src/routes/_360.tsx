import { NewPathButton } from '@/components/360/new-path-button';
import { EmptyState } from '@/components/empty-state';
import { Layout } from '@/components/layout';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_360')({
    component: RouteComponent,
    notFoundComponent: () => (
        <EmptyState title="Page Not Found" description="The requested 360 page does not exist." />
    ),
    errorComponent: ({ error }) => <EmptyState title="Error" description={String(error)} />
});

function RouteComponent() {
    return (
        <Layout title="360" action={<NewPathButton />}>
            <Outlet />
        </Layout>
    );
}
