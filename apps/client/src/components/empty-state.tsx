import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from '@/components/ui/empty';
import type { PropsWithChildren } from 'react';

interface EmptyStateProps extends PropsWithChildren {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action, children }: EmptyStateProps) {
    return (
        <Empty>
            <EmptyHeader>
                {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>{children}</EmptyContent>
            {action}
        </Empty>
    );
}
