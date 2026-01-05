import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/authClient';
import { useTheme } from '@/providers/theme-provider';
import type { User } from 'better-auth';
import { LogOutIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useMemo } from 'react';

export function UserAvatar({ user }: { user: User | undefined }) {
    const { theme, setTheme } = useTheme();
    const fallbackName = useMemo(
        () =>
            user?.name
                ?.split(' ')
                .map((part) => part[0]?.toUpperCase())
                .join(''),
        [user?.name]
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.image || ''} alt={user?.email} />
                    <AvatarFallback className="select-none">
                        {fallbackName || user?.email[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44">
                <DropdownMenuItem onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? (
                        <MoonIcon className="mr-2 h-4 w-4" />
                    ) : (
                        <SunIcon className="mr-2 h-4 w-4" />
                    )}
                    {theme === 'light' ? 'Dark' : 'Light'} Mode
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => authClient.signOut()}>
                    <LogOutIcon className="mr-2 inline-block h-4 w-4" />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
