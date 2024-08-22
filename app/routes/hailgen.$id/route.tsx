import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { eq } from 'drizzle-orm';
import { Suspense, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { db } from '~/db/db.server';
import { dent, hailpad } from '~/db/schema';
import { env } from '~/env.server';
import { protectedRoute } from '~/lib/auth.server';
import DentDetails from './dent-details';
import HailpadDetails from './hailpad-details';
import HailpadMap from './hailpad-map';

interface HailpadDent {
	// TODO: Use shared interface
	id: string;
	angle: string | null;
	centroidX: string;
	centroidY: string;
	majorAxis: string;
	minorAxis: string;
	maxDepth: string;
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	const { id } = params;

	if (!id) {
		throw new Response(null, { status: 404, statusText: 'Hailpad not found' });
	}

	const queriedHailpad = await db.query.hailpad.findFirst({
		where: eq(hailpad.id, id)
	});

	if (!queriedHailpad) {
		throw new Response(null, { status: 404, statusText: 'Hailpad not found' });
	}

	const dents = await db
		.select({
			id: dent.id,
			angle: dent.angle,
			centroidX: dent.centroidX,
			centroidY: dent.centroidY,
			majorAxis: dent.majorAxis,
			minorAxis: dent.minorAxis,
			maxDepth: dent.maxDepth
		})
		.from(dent)
		.where(eq(dent.hailpadId, queriedHailpad.id));

	const depthMapPath = `${env.BASE_URL}/${env.PUBLIC_HAILPAD_DIRECTORY}/${queriedHailpad.folderName}/dmap.png`;
	const boxfit = queriedHailpad.boxfit;
	const maxDepth = queriedHailpad.maxDepth;
	const adaptiveBlockSize = queriedHailpad.adaptiveBlockSize;
	const adaptiveC = queriedHailpad.adaptiveC;
	const hailpadId = queriedHailpad.id;
	const hailpadName = queriedHailpad.name;

	return json({
		dents,
		depthMapPath,
		boxfit,
		maxDepth,
		adaptiveBlockSize,
		adaptiveC,
		hailpadId,
		hailpadName
	});
}

export async function action({ request, params }: ActionFunctionArgs) {
	if (!params.id) return;

	const userId = await protectedRoute(request);

	const formData = await request.formData();

	// Measurement calibration fields
	const boxfit = formData.get('boxfit');
	const maxDepth = formData.get('maxDepth');

	// Thresholding fields
	const adaptiveBlock = formData.get('adaptiveBlock');
	const adaptiveC = formData.get('adaptiveC');

	// Dent management fields
	const dentID = formData.get('dentID');
	const currentBoxfit = formData.get('currentBoxfit');
	const currentMaxDepth = formData.get('currentMaxDepth');
	const deleteDentID = formData.get('deleteDentID');
	const updatedMinor = formData.get('updatedMinor');
	const updatedMajor = formData.get('updatedMajor');
	const createdMinor = formData.get('createdMinor');
	const createdMajor = formData.get('createdMajor');
	const createdMaxDepth = formData.get('createdMaxDepth');
	const createdLocation = formData.get('createdLocation');
	
	// TODO: Replace with switch block
	if (boxfit) {
		await db
			.update(hailpad)
			.set({
				boxfit: boxfit.toString(),
				updatedBy: userId,
				updatedAt: new Date()
			})
			.where(eq(hailpad.id, params.id));
	} else if (maxDepth) {
		await db
			.update(hailpad)
			.set({
				maxDepth: maxDepth.toString(),
				updatedBy: userId,
				updatedAt: new Date()
			})
			.where(eq(hailpad.id, params.id));
	} else if (adaptiveBlock && adaptiveC) {
		// TODO: Create status change and show in UI

		// Update hailpad with new adaptive block size and adaptive C-value
		await db
			.update(hailpad)
			.set({
				adaptiveBlockSize: adaptiveBlock.toString(),
				adaptiveC: adaptiveC.toString(),
				updatedBy: userId,
				updatedAt: new Date()
			})
			.where(eq(hailpad.id, params.id));

		// Delete existing dents
		await db.delete(dent).where(eq(dent.hailpadId, params.id));

		// Get hailpad
		const queriedHailpad = await db.query.hailpad.findFirst({
			where: eq(hailpad.id, params.id)
		});

		if (!queriedHailpad) return;

		const filePath = `${env.HAILPAD_DIRECTORY}/${queriedHailpad.folderName}`;

		// Invoke microservice for re-processing
		// if (env.SERVICE_HAILGEN_ENABLED) {
		const response = await fetch(new URL(`${process.env.SERVICE_HAILGEN_URL}/hailgen/dmap`), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				hailpad_id: params.id,
				file_paths: [`${filePath}/hailpad.stl`],
				adaptive_block: adaptiveBlock,
				adaptive_c: adaptiveC
			})
		});

		if (response.ok) {
			// Save dents to db
			const res = await response.json();
			const dents = res.dents;

			dents.forEach(async (hailpadDent: HailpadDent) => {
				const newDent = await db
					.insert(dent)
					.values({
						hailpadId: queriedHailpad.id,
						angle: hailpadDent.angle,
						majorAxis: hailpadDent.majorAxis,
						minorAxis: hailpadDent.minorAxis,
						maxDepth: hailpadDent.maxDepth,
						centroidX: hailpadDent.centroidX,
						centroidY: hailpadDent.centroidY
					})
					.returning();

				if (newDent.length != 1) {
					throw new Error('Error creating dent');
				}
			});
		}
	} else if (deleteDentID) {
		await db
			.delete(dent)
			.where(eq(dent.hailpadId, params.id) && eq(dent.id, String(deleteDentID)));

		await db
			.update(hailpad)
			.set({
				updatedBy: userId,
				updatedAt: new Date()
			})
			.where(eq(hailpad.id, params.id));
	} else if (dentID && updatedMinor && updatedMajor) {
		await db
			.update(dent)
			.set({
				minorAxis: String(Number(updatedMinor) * 1000 / Number(currentBoxfit)),
				majorAxis: String(Number(updatedMajor) * 1000 / Number(currentBoxfit)),
			})
			.where(eq(dent.hailpadId, params.id) && eq(dent.id, String(dentID)));

		await db
			.update(hailpad)
			.set({
				updatedBy: userId,
				updatedAt: new Date()
			})
			.where(eq(hailpad.id, params.id));
	} else if (createdMinor && createdMajor && createdMaxDepth && createdLocation) {
		const [x, y] = String(createdLocation).slice(1, -1).split(',');
		await db
			.insert(dent)
			.values({
				hailpadId: params.id,
				angle: null,
				majorAxis: String(Number(createdMajor) * 1000 / Number(currentBoxfit)),
				minorAxis: String(Number(createdMinor) * 1000 / Number(currentBoxfit)),
				centroidX: x,
				centroidY: y,
				maxDepth: String(Number(createdMaxDepth) / Number(currentMaxDepth))
			})
			.returning();

		await db
			.update(hailpad)
			.set({
				updatedBy: userId,
				updatedAt: new Date()
			})
			.where(eq(hailpad.id, params.id));
	}

	return null;
}

export default function () {
	const data = useLoaderData<typeof loader>();

	const [currentIndex, setCurrentIndex] = useState<number>(0);
	const [showCentroids, setShowCentroids] = useState<boolean>(false);
	const [download, setDownload] = useState<boolean>(false);
	const [dentData, setDentData] = useState<HailpadDent[]>([]);
	const [filters, setFilters] = useState<{
		minMinor: number;
		maxMinor: number;
		minMajor: number;
		maxMajor: number;
	}>({
		minMinor: 0,
		maxMinor: Infinity,
		minMajor: 0,
		maxMajor: Infinity
	});

	const { dents, depthMapPath, boxfit, maxDepth, adaptiveBlockSize, adaptiveC, hailpadName } = data;

	useEffect(() => {
		// Convert major and minor axes from px to mm based on boxfit length
		// and max. depth from px to mm based on max. depth map depth
		const scaledDents = dents.map((dent: HailpadDent) => {
			return {
				id: dent.id,
				angle: dent.angle,
				centroidX: dent.centroidX,
				centroidY: dent.centroidY,
				majorAxis: String((Number(dent.majorAxis) / 1000) * Number(boxfit)),
				minorAxis: String((Number(dent.minorAxis) / 1000) * Number(boxfit)),
				maxDepth: String(Number(dent.maxDepth) * Number(maxDepth))
			};
		});

		// Filter dent data based on user input
		const filteredDents = scaledDents.filter((dent: HailpadDent) => {
			return (
				Number(dent.minorAxis) >= filters.minMinor &&
				Number(dent.minorAxis) <= filters.maxMinor &&
				Number(dent.majorAxis) >= filters.minMajor &&
				Number(dent.majorAxis) <= filters.maxMajor
			);
		});
		setDentData(filteredDents);
	}, [boxfit, maxDepth, filters]);

	useEffect(() => {
		if (download) {
			setDownload(false);

			// Prepare dent data for CSV
			const headers = ['Minor Axis (mm)', 'Major Axis (mm)'];
			const csvData = dentData.map((dent) => {
				return `${dent.minorAxis},${dent.majorAxis}`;
			});

			// Prepend headers to CSV data
			csvData.unshift(headers.join(','));
			const csv = csvData.join('\n');
			const blob = new Blob([csv], { type: 'text/csv' });

			// Download CSV
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${hailpadName}.csv`;
			a.click();
		}
	}, [download]);

	return (
		<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-5">
			<Card className="row-span-5 h-min lg:col-span-2">
				<CardHeader>
					<CardTitle>{hailpadName}</CardTitle>
					<CardDescription>
						View the interactable hailpad depth map with dent analysis.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Suspense
						fallback={
							<div className="overflow-hidden rounded-md">
								<div className="flex h-full flex-col items-center justify-center">
									<div className="text-2xl font-bold">Loading</div>
								</div>
							</div>
						}
					>
						<HailpadMap
							index={currentIndex}
							dentData={dentData}
							depthMapPath={depthMapPath}
							showCentroids={showCentroids}
							onIndexChange={setCurrentIndex}
						/>
					</Suspense>
				</CardContent>
			</Card>
			<div className="lg:row-span-3">
				<HailpadDetails
					dentData={dentData}
					boxfit={boxfit}
					maxDepth={maxDepth}
					adaptiveBlockSize={adaptiveBlockSize}
					adaptiveC={adaptiveC}
					onFilterChange={setFilters}
					onShowCentroids={setShowCentroids}
					onDownload={setDownload}
				/>
			</div>
			<div className="lg:row-span-2">
				<DentDetails
					dentData={dentData}
					index={currentIndex}
					currentBoxfit={boxfit}
					currentMaxDepth={maxDepth}
					onPrevious={() => {
						if (currentIndex - 1 >= 0) {
							setCurrentIndex(currentIndex - 1);
						} else {
							setCurrentIndex(dentData.length - 1);
						}
					}}
					onNext={() => {
						if (currentIndex + 1 < dentData.length) {
							setCurrentIndex(currentIndex + 1);
						} else {
							setCurrentIndex(0);
						}
					}}
					onIndexChange={setCurrentIndex}
				/>
			</div>
		</div>
	);
}
