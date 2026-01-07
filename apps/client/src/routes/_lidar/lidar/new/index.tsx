import { CreateScanForm } from '@/components/lidar/create-scan-form';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_lidar/lidar/new/')({
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
    return <CreateScanForm />;
}
