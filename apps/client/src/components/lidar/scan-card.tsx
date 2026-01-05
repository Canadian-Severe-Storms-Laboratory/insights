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
import type { Scan } from '@/lib/client';
import { formatBytes, formatDate } from '@/lib/format';
import { STATUS_MAP } from '@/lib/status';
import { useAuth } from '@/providers/auth-provider';
import { Link } from '@tanstack/react-router';
import { Clock, EyeOff, HardDrive, RefreshCcwIcon } from 'lucide-react';

export function ScanCard({ scan }: { scan: Scan }) {
    const auth = useAuth();

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="mb-1">{scan.name}</CardTitle>
                        <CardDescription>{scan.folderName}</CardDescription>
                    </div>
                    <div className="-mr-2 flex flex-row items-center gap-2">
                        <Badge
                            variant={STATUS_MAP[scan.status].badgeVariant}
                            className="capitalize"
                        >
                            {STATUS_MAP[scan.status].name}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="flex items-center space-x-3">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Event Date</span>
                        <span className="text-muted-foreground text-sm">
                            {formatDate(new Date(scan.eventDate))}
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Clock className="text-muted-foreground h-5 w-5" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Capture Date</span>
                        <span className="text-muted-foreground text-sm">
                            {formatDate(new Date(scan.captureDate))}
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <HardDrive className="text-muted-foreground h-5 w-5" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Size</span>
                        <span className="text-muted-foreground text-sm">
                            {scan.size ? formatBytes(scan.size) : 'N/A'}
                        </span>
                    </div>
                </div>
                {scan.hidden && (
                    <div className="flex items-center space-x-3 text-yellow-600">
                        <EyeOff className="h-5 w-5" />
                        <span className="text-sm font-medium">This scan is hidden</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <span className="text-muted-foreground text-xs">
                    Created {formatDate(new Date(scan.createdAt))}
                </span>
                <div className="flex flex-row items-center gap-2">
                    {auth.isAuthenticated && scan.status === 'failed' && (
                        <Link
                            to={'/lidar/new/$id/upload'}
                            params={{
                                id: scan.id
                            }}
                        >
                            <Button variant="secondary" size="icon">
                                <RefreshCcwIcon />
                            </Button>
                        </Link>
                    )}
                    <Link
                        to={scan.status === 'complete' ? '/lidar/$id' : '/lidar/$id/log'}
                        params={{
                            id: scan.id
                        }}
                    >
                        <Button variant="outline">View</Button>
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}
