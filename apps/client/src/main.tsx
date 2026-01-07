import { AuthProvider, useAuth } from '@/providers/auth-provider.tsx';
import { ThemeProvider } from '@/providers/theme-provider';
import { routeTree } from '@/routeTree.gen';
import '@/styles/globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

const queryClient = new QueryClient();

const router = createRouter({
    routeTree,
    context: {
        auth: null
    },
    defaultPreload: 'intent'
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

function App() {
    const auth = useAuth();
    return <RouterProvider router={router} context={{ auth }} />;
}

const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <StrictMode>
            <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
                <AuthProvider>
                    <QueryClientProvider client={queryClient}>
                        <App />
                    </QueryClientProvider>
                </AuthProvider>
            </ThemeProvider>
        </StrictMode>
    );
}
