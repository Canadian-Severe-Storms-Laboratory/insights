import * as XLSX from 'xlsx-js-style';
import { ActionFunctionArgs, LoaderFunctionArgs, createCookieSessionStorage, json } from '@remix-run/node';
import { useActionData, useLoaderData } from '@remix-run/react';
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

export type UploadStatusEvent = Readonly<{
	id: string;
	dents: any[];
	maxDepthLocation: number[];
}>;

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

	const userId = await protectedRoute(request);

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
	const hailpadId = queriedHailpad.id;
	const hailpadName = queriedHailpad.name;

	return json({
		userId,
		dents,
		depthMapPath,
		boxfit,
		maxDepth,
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
	} else if (deleteDentID) {
		await db.delete(dent).where(eq(dent.hailpadId, params.id) && eq(dent.id, String(deleteDentID)));

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
				minorAxis: String((Number(updatedMinor) * 1000) / Number(currentBoxfit)),
				majorAxis: String((Number(updatedMajor) * 1000) / Number(currentBoxfit))
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
				majorAxis: String((Number(createdMajor) * 1000) / Number(currentBoxfit)),
				minorAxis: String((Number(createdMinor) * 1000) / Number(currentBoxfit)),
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
	const actionData = useActionData<typeof action>();

	const [authenticated, setAuthenticated] = useState<boolean>(false);
	const [currentIndex, setCurrentIndex] = useState<number>(0);
	const [showCentroids, setShowCentroids] = useState<boolean>(false);
	const [showFittedEllipses, setShowFittedEllipses] = useState<boolean>(false);
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

	const { userId, dents, depthMapPath, boxfit, maxDepth, hailpadName, hailpadId } = data;

	useEffect(() => {
		if (userId) setAuthenticated(true);
	}, [userId]);

	// TODO: Reload window on successful upload and retreival of updated data from service

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
	
			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.aoa_to_sheet([]);
	
			const headerStyle = {
				font: { bold: true },
				alignment: { horizontal: 'center' },
				fill: { fgColor: { rgb: "BFBFBF" } }
			};
	
			// --- Dent data table ---
			XLSX.utils.sheet_add_aoa(ws, [
				['Dent #', 'Minor Axis (mm)', 'Major Axis (mm)', 'Max. Depth (mm)', 'Centroid (x, y)', 'Angle (rad)']
			], { origin: 'A1' });
	
			['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach(cell => {
				if (!ws[cell]) ws[cell] = {};
				ws[cell].s = headerStyle;
			});
	
			const dentRows = dents.map((dent, index) => [
				{ v: index + 1, t: 'n' },
				{ f: `$H$2*${Number(dent.minorAxis)/1000}`, t: 'n' },
				{ f: `$H$2*${Number(dent.majorAxis)/1000}`, t: 'n' },
				{ f: `$H$3*${Number(dent.maxDepth)}`, t: 'n' },
				`(${dent.centroidX}, ${dent.centroidY})`,
				dent.angle || ''
			]);
			XLSX.utils.sheet_add_aoa(ws, dentRows, { origin: 'A2' });
	
			// --- Hailpad parameters table ---
			const paramStyle = {
				font: { bold: true },
				alignment: { horizontal: 'center' },
				fill: { fgColor: { rgb: "BFBFBF" } }
			};
	
			XLSX.utils.sheet_add_aoa(ws, [
				['Hailpad Parameters', ''],
				['Box-fitting Length (mm)', Number(boxfit)],
				['Max. Depth (mm)', Number(maxDepth)]
			], { origin: 'G1' });
	
			ws['G1'].s = paramStyle;
			ws['G2'].s = { font: { bold: true } };
			ws['G3'].s = { font: { bold: true } };
	
			if (!ws['!merges']) ws['!merges'] = [];
			ws['!merges'].push({ s: { r: 0, c: 6 }, e: { r: 0, c: 7 } });
	
			ws['!cols'] = [
				{ width: 8 },
				{ width: 15 },
				{ width: 15 },
				{ width: 15 },
				{ width: 15 },
				{ width: 12 },
				{ width: 20 },
				{ width: 15 }
			];
	
			for (let i = 2; i <= dents.length + 1; i++) {
				['B', 'C', 'D'].forEach(col => {
					const cell = ws[`${col}${i}`];
					if (cell) cell.z = '0.00'; // (Rounding to 2 decimal places)
				});
			}
	
			XLSX.utils.book_append_sheet(wb, ws, 'Hailpad Data');
			XLSX.writeFile(wb, `${hailpadName}.xlsx`);
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
							showFittedEllipses={showFittedEllipses}
							onIndexChange={setCurrentIndex}
						/>
					</Suspense>
				</CardContent>
			</Card>
			<div className="lg:row-span-3">
				<HailpadDetails
					authenticated={authenticated}
					dentData={dentData}
					boxfit={boxfit}
					maxDepth={maxDepth}
					onFilterChange={setFilters}
					onShowCentroids={setShowCentroids}
					onShowFittedEllipses={setShowFittedEllipses}
					onDownload={setDownload}
				/>
			</div>
			<div className="lg:row-span-2">
				<DentDetails
					authenticated={authenticated}
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
