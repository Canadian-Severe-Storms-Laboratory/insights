import { Link, useRevalidator } from '@remix-run/react';
import { LucideEdit, LucideX } from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Spinner } from '~/components/ui/spinner';
import { Actions } from './actions';
import { Path } from './columns';
import { StatusBadge } from './status-badge';

const PathMap = lazy(() => import('~/components/path-map'));

export function PathCard({
	path,
	token,
	loggedIn,
	onClose
}: {
	path: Path;
	token: string;
	loggedIn?: boolean;
	onClose: () => void;
}) {
	const revalidator = useRevalidator();
	const [failedFetch, setFailedFetch] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);

	useEffect(() => {
		if (path.status !== 'processing') return;

		// Pull data from /api/service/360/:id to update the status
		const interval = setInterval(async () => {
			const response = await fetch(`/api/service/360/${path.id}`);

			if (!response.ok) {
				clearInterval(interval);
				setFailedFetch(true);
				return;
			}

			const data: {
				completed: boolean;
				progress: number;
			} = await response.json();

			if (data.completed) {
				setProgress(null);
				clearInterval(interval);

				// Reload the page to update the status (run the loader again)
				revalidator.revalidate();
				return;
			}

			setProgress(data.progress);
		}, 1000);

		return () => clearInterval(interval);
	}, [path]);

	return (
		<Card className="h-min min-w-72 sm:min-w-96">
			<div className="flex flex-row items-center justify-between pr-6">
				<CardHeader>
					<CardTitle>{path.name}</CardTitle>
					<div className="flex flex-row flex-wrap items-center gap-2">
						<StatusBadge status={path.status} />
						{path.status === 'processing' && (
							<>
								{!failedFetch && !progress && (
									<Badge variant="outline" className="flex flex-row items-center gap-1">
										<Spinner size={12} /> Fetching service status...
									</Badge>
								)}
								{failedFetch && <Badge variant="outline">Service is offline</Badge>}
							</>
						)}
					</div>
				</CardHeader>
				<div className="flex flex-row items-center gap-2">
					{loggedIn && (path.status === 'framepos' || path.status === 'uploading') && (
						<Button
							variant="secondary"
							size="icon"
							onClick={() => {
								if (path.status === 'framepos')
									window.location.href = `/360/new/${path.id}/framepos`;
								else if (path.status === 'uploading')
									window.location.href = `/360/new/${path.id}/images`;
							}}
						>
							<LucideEdit />
						</Button>
					)}
					<Actions id={path.id} hidden={path.hidden} />
					<Button variant="outline" size="icon" onClick={onClose}>
						<LucideX />
					</Button>
				</div>
			</div>
			<CardContent>
				{path.status === 'processing' && !failedFetch && !!progress && (
					<p className="pb-4">Processing {progress.toFixed(1)}%</p>
				)}
				<div className="h-[400px] w-full overflow-hidden rounded-md lg:h-96">
					<Suspense fallback={<Skeleton />}>
						<PathMap segments={path.segments} token={token} />
					</Suspense>
				</div>
			</CardContent>
			<CardFooter className="justify-end">
				<Link to={`/360/${path.id}`} prefetch="none">
					<Button>View</Button>
				</Link>
			</CardFooter>
		</Card>
	);
}
