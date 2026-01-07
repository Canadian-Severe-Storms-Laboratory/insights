import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/authClient';
import { createContext, useContext, type PropsWithChildren } from 'react';

export type AuthContextType = {
    isAuthenticated: boolean;
    data: ReturnType<typeof authClient.useSession>['data'];
    isPending: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
    const { data, isPending } = authClient.useSession();
    const isAuthenticated = Boolean(data?.user);

    if (isPending) {
        return (
            <main className="bg-muted flex h-screen items-center justify-center">
                <div className="flex flex-row items-center gap-2">
                    <Spinner />
                    <p className="sr-only">Loading authentication status...</p>
                </div>
            </main>
        );
    }

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                data,
                isPending
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return { ...context };
}
