import { useAuth } from '@/providers/auth-provider';
import { Link, useLocation } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';
import { Button } from '../ui/button';

export function NewPathButton() {
    const auth = useAuth();
    const location = useLocation();

    if (!auth.isAuthenticated || location.pathname.startsWith('/360/new')) {
        return null;
    }

    return (
        <Link to="/360/new">
            <Button variant="secondary">
                <PlusIcon />
                New 360 Path
            </Button>
        </Link>
    );
}
