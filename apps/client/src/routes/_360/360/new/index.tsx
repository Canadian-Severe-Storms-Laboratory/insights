import { CreatePathForm } from '@/components/360/create-path-form';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_360/360/new/')({
    component: RouteComponent,
    beforeLoad: async ({ context }) => {
        const isAuthenticated = Boolean(context.auth?.isAuthenticated);

        if (!isAuthenticated) {
            throw redirect({
                to: '/auth/login'
            });
        }
    }
});

function RouteComponent() {
    return <CreatePathForm />;
}
