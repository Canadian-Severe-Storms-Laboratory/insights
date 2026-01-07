import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { type Path } from '@/lib/client';
import { formatBytes, formatDate } from '@/lib/format';
import { STATUS_MAP } from '@/lib/status';
import { useAuth } from '@/providers/auth-provider';
import { Link } from '@tanstack/react-router';
import { Clock, EllipsisVerticalIcon, EyeOff, HardDrive } from 'lucide-react';

function PathOptions({ path }: { path: Path }) {
    const auth = useAuth();

    if (auth.data === null || auth.data.user.id !== path.createdBy) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <EllipsisVerticalIcon />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
                {path.status === 'in_progress' && (
                    <DropdownMenuGroup>
                        <Link to="/360/new/$id/captures" params={{ id: path.id }}>
                            <DropdownMenuItem>Manage Captures</DropdownMenuItem>
                        </Link>
                        <Link to="/360/new/$id/panoramas" params={{ id: path.id }}>
                            <DropdownMenuItem>Manage Panoramas</DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                    </DropdownMenuGroup>
                )}
                <DropdownMenuGroup>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuGroup>
                {path.status === 'failed' && (
                    <DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <Link to="/360/new/$id/captures" params={{ id: path.id }}>
                            <DropdownMenuItem>Retry Upload</DropdownMenuItem>
                        </Link>
                    </DropdownMenuGroup>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function PathCard({ path }: { path: Path }) {
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="mb-1">{path.name}</CardTitle>
                        <CardDescription>{path.folderName}</CardDescription>
                    </div>
                    <div className="-mr-2 flex flex-row items-center gap-2">
                        <Badge variant={STATUS_MAP[path.status].badgeVariant} className="capitalize">
                            {STATUS_MAP[path.status].name}
                        </Badge>
                        <PathOptions path={path} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex items-center space-x-3">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Event Date</span>
                        <span className="text-muted-foreground text-sm">
                            {formatDate(new Date(path.eventDate))}
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Clock className="text-muted-foreground h-5 w-5" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Capture Date</span>
                        <span className="text-muted-foreground text-sm">
                            {formatDate(new Date(path.captureDate))}
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <HardDrive className="text-muted-foreground h-5 w-5" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Size</span>
                        <span className="text-muted-foreground text-sm">
                            {path.size ? formatBytes(path.size) : 'N/A'}
                        </span>
                    </div>
                </div>
                {path.hidden && (
                    <div className="flex items-center space-x-3 text-yellow-600">
                        <EyeOff className="h-5 w-5" />
                        <span className="text-sm font-medium">This path is hidden</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <span className="text-muted-foreground text-xs">
                    Created {formatDate(new Date(path.createdAt))}
                </span>
                <Link
                    disabled={path.status !== 'complete'}
                    to="/360/$id"
                    params={{
                        id: path.id
                    }}
                    search={{
                        index: 0,
                        state: 'after'
                    }}
                >
                    <Button variant="outline" disabled={path.status !== 'complete'}>
                        View
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
