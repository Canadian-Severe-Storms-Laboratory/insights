import { LoaderFunctionArgs, MetaFunction, json } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { Header } from '~/components/header';
import { getUser } from '~/db/db.server';
import { authenticator } from '~/lib/auth.server';

export const meta: MetaFunction = () => {
	return [{ title: 'CSSL Insights - Hailgen' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const id = await authenticator.isAuthenticated(request);

	const user = id ? await getUser(id) : undefined;

	return json({ user });
}

export default function Layout() {
	const data = useLoaderData<typeof loader>();

	return (
		<main className="h-full bg-muted/40">
			<Header title="NHP Hailgen" user={data.user} />
			<div className="mx-6 py-4">
				<Outlet context={data.user} />
			</div>
		</main>
	);
}
