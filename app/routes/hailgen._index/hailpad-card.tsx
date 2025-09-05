import { Link } from '@remix-run/react';
import { ArrowRight, Eye, LucideX } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Hailpad } from './columns';

export function HailpadCard({
	hailpad,
	depthMapPath,
	onClose
}: {
	hailpad: Hailpad;
	depthMapPath: string;
	onClose: () => void;
}) {
	return (
		<Card className="h-min min-w-96 pr-4">
			<div className="flex flex-row items-center justify-between">
				<CardHeader>
					<CardTitle>{hailpad.name}</CardTitle>
				</CardHeader>
				<div className="flex flex-row items-center gap-4">
					<Link to={`/hailgen/${hailpad.id}`} prefetch="none">
						<Button className="max-w-44 gap-2">
							<Eye size={16} />
							View
						</Button>
					</Link>
					<Button variant="outline" size="icon" onClick={onClose}>
						<LucideX />
					</Button>
				</div>
			</div>
			<CardContent className="flex flex-col items-center">
				{depthMapPath ? <img src={depthMapPath} className="w-[400px]" /> : <p>Failed to load depth map</p>}
			</CardContent>
		</Card>
	);
}
