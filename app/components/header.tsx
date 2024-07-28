import { Link } from '@remix-run/react';
import { LucideTornado } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { UserAvatar } from './user-avatar';

export function Header({
	title,
	user,
	className
}: {
	title: string;
	user?: {
		email: string;
		name: string | null;
		imageUrl: string | null;
	};
	className?: string;
}) {
	return (
		<header
			className={cn(
				'sticky top-0 mb-2 z-20 flex items-center justify-between gap-4 border-b bg-background px-4 py-4 md:px-6',
				className
			)}
		>
			<div className="flex flex-row items-center gap-4">
				<Link to="/">
					<Button variant="outline" size="icon">
						<LucideTornado size={24} />
					</Button>
				</Link>
				<h1 className="text-xl font-bold">
					Insights <span className="font-normal">{title}</span>
				</h1>
			</div>
			{user && <UserAvatar user={user} />}
		</header>
	);
}
