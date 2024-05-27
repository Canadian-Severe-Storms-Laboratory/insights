import '~/tailwind.css';

import clsx from 'clsx';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import { themeSessionResolver } from '~/lib/sessions.server';
import { Toaster } from '~/components/ui/sonner';
import { LoaderFunctionArgs } from '@remix-run/node';
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from 'remix-themes';

// Return the theme from the session storage using the loader
export async function loader({ request }: LoaderFunctionArgs) {
	const { getTheme } = await themeSessionResolver(request);
	return {
		theme: getTheme()
	};
}

export default function AppWithProviders() {
	const data = useLoaderData<typeof loader>();
	return (
		<ThemeProvider specifiedTheme={data.theme} themeAction="/action/set-theme">
			<App />
		</ThemeProvider>
	);
}

export function App() {
	const data = useLoaderData<typeof loader>();
	const [theme] = useTheme();
	return (
		<html lang="en" className={clsx(theme)}>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
				<Links />
			</head>
			<body className="min-h-screen h-screen">
				<Outlet />
				<Toaster />
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}
