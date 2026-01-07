import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { Link, useLocation } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

export function NewPadButton() {
    const auth = useAuth();
    const location = useLocation();

    if (!auth.isAuthenticated || location.pathname.startsWith('/hailgen/new')) {
        return null;
    }

    return (
        <Link to="/hailgen/new">
            <Button variant="secondary">
                <PlusIcon />
                New Hailpad
            </Button>
        </Link>
    );
}
