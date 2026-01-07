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
import { type Pad } from '@/lib/client';
import { formatDate } from '@/lib/format';
import { STATUS_MAP } from '@/lib/status';
import { useAuth } from '@/providers/auth-provider';
import { Link } from '@tanstack/react-router';
import { CloudSync, EllipsisVerticalIcon, EyeOff } from 'lucide-react';

function PadOptions({ pad }: { pad: Pad }) {
    const auth = useAuth();

    if (auth.data === null || auth.data.user.id !== pad.createdBy) {
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
                {pad.status === 'in_progress' && (
                    <DropdownMenuGroup>
                        <Link to="/hailgen/new/$id/upload" params={{ id: pad.id }}>
                            <DropdownMenuItem>Upload</DropdownMenuItem>
                        </Link>
                        <Link to="/hailgen/new/$id/mask" params={{ id: pad.id }}>
                            <DropdownMenuItem>Mask</DropdownMenuItem>
                        </Link>
                        <Link to="/hailgen/new/$id/depth" params={{ id: pad.id }}>
                            <DropdownMenuItem>Depth</DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                    </DropdownMenuGroup>
                )}
                <DropdownMenuGroup>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuGroup>
                {pad.status === 'failed' && (
                    <DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <Link to="/hailgen/new/$id/upload" params={{ id: pad.id }}>
                            <DropdownMenuItem>Retry Upload</DropdownMenuItem>
                        </Link>
                    </DropdownMenuGroup>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function PadCard({ pad }: { pad: Pad }) {
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="mb-1">{pad.name}</CardTitle>
                        <CardDescription>{pad.folderName}</CardDescription>
                    </div>
                    <div className="-mr-2 flex flex-row items-center gap-2">
                        <Badge variant={STATUS_MAP[pad.status].badgeVariant} className="capitalize">
                            {STATUS_MAP[pad.status].name}
                        </Badge>
                        <PadOptions pad={pad} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex items-center space-x-3">
                    <CloudSync className="text-muted-foreground h-5 w-5" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Depth Map Status</span>
                        <span className="text-muted-foreground text-sm">
                            {pad.depthMapStatus === 'complete'
                                ? 'Generated'
                                : 'Not generated'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <CloudSync className="text-muted-foreground h-5 w-5" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Analysis Status</span>
                        <span className="text-muted-foreground text-sm">
                            {pad.analysisStatus === 'complete'
                                ? 'Complete'
                                : 'Not complete'}
                        </span>
                    </div>
                </div>
                {pad.hidden && (
                    <div className="flex items-center space-x-3 text-yellow-600">
                        <EyeOff className="h-5 w-5" />
                        <span className="text-sm font-medium">This path is hidden</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <span className="text-muted-foreground text-xs">
                    Created {formatDate(new Date(pad.createdAt))}
                </span>
                <Link
                    disabled={pad.status !== 'complete'}
                    to="/hailgen/$id"
                    params={{
                        id: pad.id
                    }}
                >
                    <Button variant="outline" disabled={pad.status !== 'complete'}>
                        View
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
