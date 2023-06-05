import { type NextPage } from 'next';
import Head from 'next/head';
import Header from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { useSession } from 'next-auth/react';
import { View360 } from '@/components/view-360';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { View360Map } from '@/components/map';
import { LngLat } from 'mapbox-gl';
import { useRouter } from 'next/router';
import { api } from '@/utils/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import format from 'date-fns/format';

const View: NextPage = () => {
	const session = useSession();
	const router = useRouter();
	const {
		id,
	}: {
		id?: string;
	} = router.query;
	const path = api.paths.getPublic.useQuery(
		{
			id: id || '',
		},
		{
			refetchInterval: false,
			refetchOnMount: false,
			refetchOnReconnect: true,
			refetchOnWindowFocus: false,
		}
	);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [currentImage, setCurrentImage] = useState<'before' | 'after'>('after');

	const imagesSorted = path.data?.images
		.filter((image) => {
			return image.source === 'NTP';
		})
		.sort((a, b) => {
			if (b.index === null && a.index !== null) return -1;
			else if (a.index === null && b.index !== null) return 1;
			else if (a.index === null && b.index === null) return 0;
			else return (a.index || 0) - (b.index || 0);
		});

	const points = imagesSorted?.map((image) => {
		return LngLat.convert({
			lat: image.lat,
			lng: image.lng,
		});
	});

	if (
		path.isLoading ||
		!path.data ||
		path.isFetching ||
		path.isError ||
		!path.data.images.length
	) {
		return (
			<>
				<Head>
					<title>{id ? `NTP 360 | ${id}` : 'NTP 360'}</title>
					<meta name="description" content="Generated by create-t3-app" />
					<link rel="icon" href="/favicon.ico" />
				</Head>
				<main className="h-screen">
					<Header
						title={
							<>
								NTP <span className="text-success">360</span>
							</>
						}
						session={session.data}
					/>
					<Toaster />
					<div className="container flex flex-col items-center justify-center p-6">
						<h2 className="mb-4 flex w-full flex-row items-center gap-4 text-left text-2xl font-medium">
							{!path.data?.images.length &&
							!(path.isLoading || !path.data || path.isFetching || path.isError)
								? 'Path incomplete...'
								: 'Loading...'}
						</h2>
						<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-5 lg:grid-rows-2">
							<Skeleton className="relative row-span-3 h-[500px] overflow-hidden rounded-md lg:col-span-4 lg:h-[548px]" />
							<Skeleton className="h-full lg:row-span-1" />

							<div className="col-span-1 lg:row-span-1 ">
								<Skeleton className="h-[400px] overflow-hidden rounded-md lg:h-40" />
							</div>
						</div>
					</div>
				</main>
			</>
		);
	}

	return (
		<>
			<Head>
				<title>{`NTP 360 - ${path.data.name}`}</title>
				<meta name="description" content="Generated by create-t3-app" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<main className="h-screen">
				<Header
					title={
						<>
							NTP <span className="text-success">360</span>
						</>
					}
					session={session.data}
				/>
				<Toaster />
				<div className="container flex flex-col items-center justify-center p-6">
					<h2 className="mb-4 flex w-full flex-row items-center gap-4 text-left text-2xl font-medium">
						{path.data?.name || 'Loading...'}
					</h2>
					<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-6 lg:grid-rows-2">
						<View360
							image={imagesSorted?.[currentIndex]}
							currentImage={currentImage}
							setCurrentImage={setCurrentImage}
							onNext={() => {
								if (imagesSorted && currentIndex + 1 < imagesSorted?.length) {
									setCurrentIndex(currentIndex + 1);
								}
							}}
							onPrevious={() => {
								if (imagesSorted && currentIndex - 1 >= 0) {
									setCurrentIndex(currentIndex - 1);
								}
							}}
							className="relative row-span-2 h-[500px] overflow-hidden rounded-md lg:col-span-4 lg:h-[505px]"
						/>
						<Card className="lg:row-span-1 lg:col-span-2">
							<CardHeader>
								<CardTitle>Details</CardTitle>
								<CardDescription>About the current 360 view.</CardDescription>
								<br />
								<CardContent className="p-0">
									<div className="flex flex-row">
										<div className="flex flex-col w-1/2">
									<CardDescription>Event occurred on</CardDescription>
									<p>{format(path.data?.date, 'MMMM d, yyyy')}</p>
									<br />
									</div>
									<div className="flex flex-col">
									<CardDescription>Capture taken on</CardDescription>
									<p>
										{(() => {
											try {
												return format(
													currentImage === 'after'
														? path.data?.date
														: imagesSorted?.[currentIndex]?.before.date_taken,
													'MMMM d, yyyy'
												);
											} catch (err) {
												return 'N/A';
											}
										})()}
									</p>
									<br />
									</div>
									</div>
									<div className="flex flex-row">
									<div className="flex flex-col">
									<CardDescription>Located at</CardDescription>
									<p>
										{currentImage === 'after'
											? imagesSorted?.[currentIndex]?.lng
											: imagesSorted?.[currentIndex]?.before.lng}
										,{' '}
										{currentImage === 'after'
											? imagesSorted?.[currentIndex]?.lat
											: imagesSorted?.[currentIndex]?.before.lat}
									</p>
									<br />
									</div>
									<div className="flex flex-col">
									{imagesSorted?.[currentIndex - 1] && (
										<>
											<CardDescription>Previous location at</CardDescription>
											<p>
												{currentImage === 'after'
													? imagesSorted?.[currentIndex - 1]?.lng
													: imagesSorted?.[currentIndex - 1]?.before.lng}
												,{' '}
												{currentImage === 'after'
													? imagesSorted?.[currentIndex - 1]?.lat
													: imagesSorted?.[currentIndex - 1]?.before.lat}
											</p>
											<br />
										</>
									)}
									</div>
									</div>
									<CardDescription>Panorama capture</CardDescription>
									<p>{`${currentIndex + 1} / ${
										imagesSorted?.length || currentIndex + 1
									}`}</p>
								</CardContent>
							</CardHeader>
						</Card>
						<div className="lg:row-span-2 lg:col-span-2">
							<View360Map
								points={points || []}
								className="h-[400px] overflow-hidden rounded-md lg:h-40"
							/>
						</div>
					</div>
				</div>
			</main>
		</>
	);
};

export default View;
