import { CreatePadForm } from '@/components/hailgen/create-pad-form';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_hailgen/hailgen/new/')({
    component: RouteComponent,
    beforeLoad: async ({ context }) => {
        if (!context.auth?.isAuthenticated) {
            throw redirect({
                to: '/auth/login'
            });
        }
    }
});

function RouteComponent() {
    return <CreatePadForm />;
}
