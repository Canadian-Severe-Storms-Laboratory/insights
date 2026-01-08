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
        <div className="min-h-screen bg-background flex flex-col">
            <Header title={title} action={action} />
            <main className="flex-1 pt-4 mx-4">{children}</main>
        </div>
    );
}
