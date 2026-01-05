import tornado from '@/assets/bnr-tornado.jpg';
import { EmptyState } from '@/components/empty-state';

import { WesternEngineeringLogo } from '@/components/western-eng-logo';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
    component: RouteComponent,
    notFoundComponent: () => (
        <EmptyState title="Page Not Found" description="The requested auth page does not exist." />
    ),
    errorComponent: ({ error }) => <EmptyState title="Error" description={String(error)} />
});

function RouteComponent() {
    return (
        <div className="grid h-screen lg:grid-cols-2">
            <div className="mx-2 flex flex-col items-center justify-center">
                <Outlet />
            </div>
            <div className="relative hidden lg:block">
                <img src={tornado} className="h-full object-cover" />
                <WesternEngineeringLogo />
                <div className="from-background absolute top-0 left-0 h-full w-full bg-linear-to-r" />
            </div>
        </div>
    );
}
