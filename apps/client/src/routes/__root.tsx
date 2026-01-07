import { EmptyState } from '@/components/empty-state';
import { Layout } from '@/components/layout';
import { Toaster } from '@/components/ui/sonner';
import type { AuthContextType } from '@/providers/auth-provider';
import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

const RootLayout = () => (
    <>
        <HeadContent />
        <Outlet />
        <Toaster position="bottom-right" />
        <TanStackRouterDevtools />
    </>
);

export const Route = createRootRouteWithContext<{
    auth: AuthContextType | null;
}>()({
    component: RootLayout,
    notFoundComponent: () => (
        <Layout title="Error">
            <EmptyState title="Page Not Found" description="The requested page does not exist." />
        </Layout>
    ),
    errorComponent: ({ error }) => (
        <Layout title="Error">
            <EmptyState title="Error" description={String(error)} />
        </Layout>
    )
});
