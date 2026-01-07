import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { Link, useLocation } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

export function NewScanButton() {
    const auth = useAuth();
    const location = useLocation();

    if (!auth.isAuthenticated || location.pathname.startsWith('/lidar/new')) {
        return null;
    }

    return (
        <Link to="/lidar/new">
            <Button variant="secondary">
                <PlusIcon />
                New LiDAR Scan
            </Button>
        </Link>
    );
}
