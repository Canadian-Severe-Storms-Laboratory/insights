import type { Scan } from './client';

type StatusMap = Record<
    Scan['status'],
    { name: string; badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' }
>;

export const STATUS_MAP: StatusMap = {
    complete: { name: 'Complete', badgeVariant: 'secondary' },
    in_progress: { name: 'In Progress', badgeVariant: 'outline' },
    pending: { name: 'Pending', badgeVariant: 'outline' },
    failed: { name: 'Failed', badgeVariant: 'destructive' }
} as const;
