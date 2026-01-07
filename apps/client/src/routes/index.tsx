import tornado from '@/assets/bnr-tornado.jpg';

import { version } from '@/../package.json';
import { EmptyState } from '@/components/empty-state';
import { MesonetIcon } from '@/components/mesonet-icon';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { WesternEngineeringLogo } from '@/components/western-eng-logo';
import { useAuth } from '@/providers/auth-provider';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Axis3D, CircleDotDashed, Rotate3D } from 'lucide-react';

export const Route = createFileRoute('/')({
    head: () => ({
        meta: [
            {
                title: 'CSSL Insights'
            }
        ]
    }),
    component: Index,
    errorComponent: ({ error }) => <EmptyState title="Error" description={String(error)} />
});

function Index() {
    const { data } = useAuth();

    return (
        <div className="h-screen">
            <div className="relative z-0 h-screen">
                <img className="h-full w-full object-cover" src={tornado} alt="Tornado" />
                <div className="from-background absolute top-0 left-0 h-full w-full bg-linear-to-r" />
            </div>
            <div className="absolute top-0 left-0 h-full w-full">
                <WesternEngineeringLogo />
                <header className="absolute top-0 right-0 m-4">
                    {data ? (
                        <div className="flex flex-row gap-4">
                            <UserAvatar user={data.user} />
                        </div>
                    ) : (
                        <div className="flex flex-row gap-2">
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
                            <Link to="/360">
                                <Button className="gap-2">
                                    <Rotate3D /> 360
                                </Button>
                            </Link>
                            <Link to="/lidar">
                                <Button className="gap-2">
                                    <Axis3D /> LiDAR
                                </Button>
                            </Link>
                            <Link to="/hailgen">
                                <Button className="gap-2">
                                    <CircleDotDashed /> Hailgen
                                </Button>
                            </Link>
                        </div>
                        <div className="flex flex-row gap-2">
                            <Button
                                className="gap-2"
                                variant="secondary"
                                onClick={() => (window.location.href = 'https://meso.cssl.ca')}
                            >
                                <MesonetIcon size={26} /> Mesonet
                            </Button>
                        </div>
                    </nav>
                </main>
            </div>
        </div>
    );
}
