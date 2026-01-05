import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { Link } from '@tanstack/react-router';
import { CsslLogo } from './cssl-logo';
import { UserAvatar } from './user-avatar';

export function Header({
    title,
    className,
    action
}: {
    title: string;
    className?: string;
    action?: React.ReactNode;
}) {
    const { data } = useAuth();

    return (
        <header
            className={cn(
                'bg-background sticky top-0 z-20 flex items-center justify-between gap-4 border-b px-4 py-4 md:px-6',
                className
            )}
        >
            <div className="flex flex-row items-center gap-4">
                <Link to="/">
                    <Button variant="outline" size="icon">
                        <CsslLogo size={24} />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">
                    Insights <span className="font-normal">{title}</span>
                </h1>
            </div>
            <div className="flex flex-row items-center gap-4">
                {action}
                {data && <UserAvatar user={data.user} />}
                {!data && (
                    <Link to="/auth/login">
                        <Button>Log In</Button>
                    </Link>
                )}
            </div>
        </header>
    );
}
