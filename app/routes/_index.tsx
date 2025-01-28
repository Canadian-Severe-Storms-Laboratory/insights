import tornado from '~/assets/bnr-tornado.jpg';

import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Link, json, useLoaderData, useNavigate } from '@remix-run/react';
import { Axis3D, CircleDotDashed, LucideLifeBuoy, Rotate3D } from 'lucide-react';
import { version } from '~/../package.json';
import { MesonetIcon } from '~/components/mesonet-icon';
import { Button } from '~/components/ui/button';
import { UserAvatar } from '~/components/user-avatar';
import { WesternEngineeringLogo } from '~/components/western-eng-logo';
import { getUser } from '~/db/db.server';
import { authenticator } from '~/lib/auth.server';

export const meta: MetaFunction = () => {
	return [{ title: 'CSSL Insights - Home' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const id = await authenticator.isAuthenticated(request);

	if (!id) return json(null);

	const user = await getUser(id);

	if (!user)
		return json(null, {
			status: 404
		});

	return json({
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			imageUrl: user.imageUrl
		}
	});
}

export default function Index() {
	const navigate = useNavigate();
	const data = useLoaderData<typeof loader>();

	return (
		<div className="h-screen">
			<div className="relative z-0 h-screen">
				<img className="h-full w-full object-cover" src={tornado} alt="Tornado" />
				<div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-background" />
			</div>
			<div className="absolute left-0 top-0 h-full w-full">
				<WesternEngineeringLogo />
				<header className="absolute right-0 top-0 m-4">
					{data ? (
						<div className="flex flex-row gap-4">
							<UserAvatar user={data.user} />
						</div>
					) : (
						<div className="flex flex-row gap-2">
							<Link to="/support">
								<Button variant="secondary" className="gap-2" size="icon">
									<LucideLifeBuoy />
								</Button>
							</Link>
							<Link to="/auth/login">
								<Button variant="secondary">Login</Button>
							</Link>
						</div>
					)}
				</header>
				<main className="flex h-screen flex-col justify-center gap-8 p-6 lg:p-16">
					<h1 className="text-6xl tracking-tight">
						CSSL <b>Insights</b>
					</h1>
					<h3 className="text-xl font-semibold">{`v${version}`}</h3>
					<nav className="flex flex-col gap-2">
						<div className="flex flex-row gap-2">
							<Button className="gap-2" onClick={() => navigate('/360')}>
								<Rotate3D /> 360
							</Button>
							<Button className="gap-2" onClick={() => navigate('/lidar')}>
								<Axis3D /> LiDAR
							</Button>
							<Button className="gap-2" onClick={() => navigate('/hailgen')}>
								<CircleDotDashed /> Hailgen
							</Button>
						</div>
						<div className="flex flex-row gap-2">
							<Button className="gap-2" variant="secondary" onClick={() => navigate('/mesonet')}>
								<MesonetIcon size={26} /> Mesonet
							</Button>
						</div>
					</nav>
				</main>
			</div>
		</div>
	);
}
