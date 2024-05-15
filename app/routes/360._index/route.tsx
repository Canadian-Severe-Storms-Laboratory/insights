import { MetaFunction, json, useLoaderData, useOutletContext } from '@remix-run/react';
import { Path, columns } from './columns';
import { DataTable } from './data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { useState } from 'react';
import { PathCard } from './path-card';

export const meta: MetaFunction = () => {
	return [{ title: 'NTP Insights - 360' }];
};

export async function loader() {
	return json({
		paths: [
			{
				id: '1',
				name: 'Didsbury',
				size: 1254,
				captures: 123,
				created: new Date(),
				modified: new Date(),
				status: 'archived'
			},
			{
				id: '2',
				name: 'Testing',
				size: 1254,
				captures: 123,
				created: new Date(),
				modified: new Date(),
				status: 'completed'
			}
		] as Path[]
	});
}

export default function Dashboard() {
	const data = useLoaderData<typeof loader>();
	const userContext = useOutletContext<{
		id: string;
		email: string;
		name: string;
		imageUrl: string;
	} | null>();
	const [path, setPath] = useState<Path | null>(null);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Paths</CardTitle>
				<CardDescription>Explore the different paths available to you.</CardDescription>
			</CardHeader>
			<CardContent className="grid xl:grid-flow-col gap-4">
				<DataTable
					columns={columns}
					data={data.paths.map((path) => {
						return {
							...path,
							created: new Date(path.created),
							modified: new Date(path.modified)
						};
					})}
					onRowClick={(index) =>
						setPath({
							...data.paths[index],
							created: new Date(data.paths[index].created),
							modified: new Date(data.paths[index].modified)
						})
					}
				/>
				{path && (
					<PathCard
						path={path}
						loggedIn={userContext ? true : false}
						onClose={() => setPath(null)}
					/>
				)}
			</CardContent>
		</Card>
	);
}
