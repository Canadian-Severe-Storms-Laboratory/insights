import { EmptyState } from '@/components/empty-state';
import { NewPadButton } from '@/components/hailgen/new-pad-button';
import { Layout } from '@/components/layout';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_hailgen')({
    component: RouteComponent,
    notFoundComponent: () => (
        <EmptyState
            title="Page Not Found"
            description="The requested NHP Hailgen page does not exist."
        />
    ),
    errorComponent: ({ error }) => <EmptyState title="Error" description={String(error)} />
});

function RouteComponent() {
    return (
        <Layout title="NHP Hailgen" action={<NewPadButton />}>
            <Outlet />
        </Layout>
    );
}
