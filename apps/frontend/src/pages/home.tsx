import { type GetServerSidePropsContext, type NextPage } from 'next';
import getConfig from 'next/config';
import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { ntpProtectedRoute } from '@/lib/protectedRoute';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LucideRotate3d, LucideShare2 } from 'lucide-react';

const Home: NextPage = () => {
	const session = useSession();
	const { publicRuntimeConfig } = getConfig();

	return (
		<>
			<Head>
				<title>NTP Home</title>
				<meta name="description" content="Generated by create-t3-app" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<main className="flex h-screen">
				<Header title="Welcome" session={session.data} />
				<Toaster />
				<div className="container flex items-center ">
					<div className="container flex flex-col items-start justify-start space-y-10 p-6">
						<div className="text-6xl">
							<span className="font-bold">NTP</span> Insights
						</div>
						<h3 className=" text-2xl font-semibold">{`v${publicRuntimeConfig?.version}`}</h3>
						<div className="flex flex-row items-start space-x-4">
							<Link href="/social/dashboard">
								<Button className="flex flex-row space-x-2">
									<LucideShare2 />
									<p>Social</p>
								</Button>
							</Link>
							<Link href="/360/dashboard">
								<Button className="flex flex-row space-x-2">
									<LucideRotate3d />
									<p>360</p>
								</Button>
							</Link>
							<Button onClick={() => {
								void fetch('/backend/api/upload', {
									method: 'POST',
								});
							}}>
								Test
							</Button>
						</div>
					</div>
				</div>
			</main>
		</>
	);
};

export default Home;

export async function getServerSideProps(context: GetServerSidePropsContext) {
	return await ntpProtectedRoute(context);
}
