import { Header } from '@/components/header';
import type { PropsWithChildren } from 'react';

export function Layout({
    title,
    action,
    children
}: PropsWithChildren<{
    title: string;
    action?: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen bg-background">
            <Header title={title} action={action} />
            <main className="mx-6">{children}</main>
        </div>
    );
}
