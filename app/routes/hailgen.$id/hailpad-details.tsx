import { FormProvider, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { Form } from '@remix-run/react';
import { CornerDownLeft, Dot, FileSpreadsheet, Filter, FilterX, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import Histogram from './histogram';

interface HailpadDent {
	angle: string | null;
	centroidX: string;
	centroidY: string;
	majorAxis: string;
	minorAxis: string;
	maxDepth: string;
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p>{value}</p>
		</div>
	);
}

function DetailSection({ min, max, avg }: { min?: number; max?: number; avg?: number }) {

	let minStr;
	let maxStr;
	let avgStr;

	if (min) minStr = min.toFixed(2).toString();
	if (max) maxStr = max.toFixed(2).toString();
	if (avg) avgStr = avg.toFixed(2).toString();

	return (
		<div className="m-4 grid grid-cols-3 gap-4">
			{minStr && <Detail label="Minimum" value={`${minStr} mm`} />}
			{maxStr && <Detail label="Maximum" value={`${maxStr} mm`} />}
			{avgStr && <Detail label="Average" value={`${avgStr} mm`} />}
		</div>
	);
}

function createBoxfitSchema() {
	return z.object({
		boxfit: z.number().min(0, {
			message: 'Box-fitting length must be positive.'
		})
	});
}

function createMaxDepthSchema() {
	return z.object({
		maxDepth: z.number().min(0, {
			message: 'Max. depth length must be positive.'
		})
	});
}

function createFilterSchema() {
	return z
		.object({
			minMinor: z.number().min(0, {
				message: 'Lower bound of minor axis must be positive.'
			}),
			maxMinor: z.number().min(0, {
				message: 'Upper bound of minor axis must be greater than lower bound.'
			}),
			minMajor: z.number().min(0, {
				message: 'Lower bound of major axis must be positive.'
			}),
			maxMajor: z.number().min(0, {
				message: 'Upper bound of major axis must be greater than lower bound.'
			})
		})
		.refine((data) => data.maxMinor > data.minMinor, {
			path: ['maxMinor'], // path to the error
			message: 'Upper bound of minor axis must be greater than lower bound.'
		})
		.refine((data) => data.maxMajor > data.minMajor, {
			path: ['maxMajor'], // path to the error
			message: 'Upper bound of major axis must be greater than lower bound.'
		});
}

export default function HailpadDetails({
	authenticated,
	dentData,
	boxfit,
	maxDepth,
	onFilterChange,
	onShowCentroids,
	onShowFittedEllipses,
	onDownload
}: {
	authenticated: boolean;
	dentData: HailpadDent[];
	boxfit: string;
	maxDepth: string;
	onFilterChange: (value: {
		minMinor: number;
		maxMinor: number;
		minMajor: number;
		maxMajor: number;
	}) => void;
	onShowCentroids: (value: boolean) => void;
	onShowFittedEllipses: (value: boolean) => void;
	onDownload: (value: boolean) => void;
}) {
	const [minMinor, setMinMinor] = useState<number>(0);
	const [maxMinor, setMaxMinor] = useState<number>(0);

	const [minMajor, setMinMajor] = useState<number>(0);
	const [maxMajor, setMaxMajor] = useState<number>(0);

	const [avgMinor, setAvgMinor] = useState<number>(0);
	const [avgMajor, setAvgMajor] = useState<number>(0);

	const [depth, setDepth] = useState<number>(0);

	const [isShowCentroidChecked, setIsShowCentroidChecked] = useState<boolean>(false);
	const [isShowFittedEllipsesChecked, setIsShowFittedEllipsesChecked] = useState<boolean>(false);

	const [boxfitForm, boxfitFields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: createBoxfitSchema() });
		},
		onSubmit() {
			const formData = new FormData();
			formData.append(boxfitFields.boxfit.name, boxfitFields.boxfit.value || '');
		}
	});

	const [maxDepthForm, maxDepthFields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: createMaxDepthSchema() });
		},
		onSubmit() {
			const formData = new FormData();
			formData.append(maxDepthFields.maxDepth.name, maxDepthFields.maxDepth.value || '');
		}
	});


	const [filterForm, filterFields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: createFilterSchema() });
		},
		onSubmit() {
			onFilterChange({
				minMinor: Number(filterFields.minMinor.value) || 0,
				maxMinor: Number(filterFields.maxMinor.value) || Infinity,
				minMajor: Number(filterFields.minMajor.value) || 0,
				maxMajor: Number(filterFields.maxMajor.value) || Infinity
			});
		}
	});

	useEffect(() => {
		setMinMinor(Math.min(...dentData.map((dent) => Number(dent.minorAxis))));
		setMaxMinor(Math.max(...dentData.map((dent) => Number(dent.minorAxis))));

		setMinMajor(Math.min(...dentData.map((dent) => Number(dent.majorAxis))));
		setMaxMajor(Math.max(...dentData.map((dent) => Number(dent.majorAxis))));

		setAvgMinor(dentData.reduce((acc, dent) => acc + Number(dent.minorAxis), 0) / dentData.length);
		setAvgMajor(dentData.reduce((acc, dent) => acc + Number(dent.majorAxis), 0) / dentData.length);

		setDepth(dentData.reduce((acc, dent) => acc + Number(dent.maxDepth), 0) / dentData.length);
	}, [dentData]);

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-row justify-between">
					<div>
						<CardTitle className="mb-2">Hailpad Details</CardTitle>
						<CardDescription>About the current hailpad view.</CardDescription>
					</div>
					{authenticated && <div className="justify-end">
						<Popover>
							<PopoverTrigger>
								<Button asChild variant="outline" className="h-8 w-8 p-2">
									<Settings />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-76">
								<div className="space-y-4">
									<div className="mb-6">
										<p className="text-lg font-semibold">View</p>
										<CardDescription className="text-sm">
											Adjust depth map overlays and calibration values.
										</CardDescription>
									</div>
									<div className="flex flex-row items-center space-x-2">
										<Checkbox
											id="show-centroids"
											checked={isShowCentroidChecked}
											onClick={() => setIsShowCentroidChecked(!isShowCentroidChecked)}
											onCheckedChange={onShowCentroids}
										/>
										<Label
											htmlFor="show-centroids"
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											Show centroids
										</Label>
									</div>
									<div className="flex flex-row items-center space-x-2">
										<Checkbox
											id="show-fitted-ellipses"
											checked={isShowFittedEllipsesChecked}
											onClick={() => setIsShowFittedEllipsesChecked(!isShowFittedEllipsesChecked)}
											onCheckedChange={onShowFittedEllipses}
										/>
										<Label
											htmlFor="show-fitted-ellipses"
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											Show fitted ellipses
										</Label>
									</div>
									<FormProvider context={boxfitForm.context}>
										<Form method="post" id={boxfitForm.id} onSubmit={boxfitForm.onSubmit}>
											<div className="mt-1 flex flex-row items-center">
												<div className="mr-4 w-48">
													<Label>Box-fitting Length (mm)</Label>
												</div>
												<Input
													className="mr-4 h-8 w-20"
													type="number"
													key={boxfitFields.boxfit.key}
													name={boxfitFields.boxfit.name}
													defaultValue={boxfitFields.boxfit.initialValue}
													placeholder={boxfit}
													step="any"
												/>
												<Button type="submit" variant="secondary" className="h-8 w-8 p-2">
													<CornerDownLeft />
												</Button>
											</div>
											<p className="text-sm text-primary/60">{boxfitFields.boxfit.errors}</p>
										</Form>
									</FormProvider>
									<FormProvider context={maxDepthForm.context}>
										<Form method="post" id={maxDepthForm.id} onSubmit={maxDepthForm.onSubmit}>
											<div className="mt-1 flex flex-row items-center">
												<div className="mr-4 w-48">
													<Label htmlFor={maxDepthFields.maxDepth.id}>Maximum Depth (mm)</Label>
												</div>
												<Input
													className="mr-4 h-8 w-20"
													type="number"
													key={maxDepthFields.maxDepth.key}
													name={maxDepthFields.maxDepth.name}
													defaultValue={maxDepthFields.maxDepth.initialValue}
													placeholder={maxDepth}
													step="any"
												/>
												<Button type="submit" variant="secondary" className="h-8 w-8 p-2">
													<CornerDownLeft />
												</Button>
											</div>
											<p className="text-sm text-primary/60">{maxDepthFields.maxDepth.errors}</p>
										</Form>
									</FormProvider>
								</div>
							</PopoverContent>
						</Popover>
					</div>}
				</div>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="minor">
					<div className="flex flex-row items-center justify-between">
						<TabsList>
							<TabsTrigger value="minor">Minor Axis</TabsTrigger>
							<TabsTrigger value="major">Major Axis</TabsTrigger>
						</TabsList>
						<div className="flex flex-row space-x-2">
							<Button
								variant="secondary"
								className="h-8 w-8 p-2 hover:text-green-500"
								onClick={() => onDownload(true)}
							>
								<FileSpreadsheet />
							</Button>
							<Popover>
								<PopoverTrigger>
									<Button asChild variant="outline" className="h-8 w-8 p-2">
										<Filter />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-96">
									<div className="space-y-4">
										<div className="mb-6">
											<p className="text-lg font-semibold">Filter</p>
											<CardDescription className="text-sm">
												Refine hailpad dent data by size.
											</CardDescription>
										</div>
										<FormProvider context={filterForm.context}>
											<Form
												id={filterForm.id}
												onReset={() => {
													onFilterChange({
														minMinor: 0,
														maxMinor: Infinity,
														minMajor: 0,
														maxMajor: Infinity
													});
												}}
												onSubmit={filterForm.onSubmit}
											>
												<div className="mt-1 flex flex-row items-center justify-between text-sm">
													<Input
														className="h-8 w-20"
														type="number"
														key={filterFields.minMinor.key}
														name={filterFields.minMinor.name}
														defaultValue={filterFields.minMinor.initialValue}
														placeholder="Min."
														step="any"
													/>
													<p>≤</p>
													<p>Minor Axis (mm)</p>
													<p>≤</p>
													<Input
														className="h-8 w-20"
														type="number"
														key={filterFields.maxMinor.key}
														name={filterFields.maxMinor.name}
														defaultValue={filterFields.maxMinor.initialValue}
														placeholder="Max."
														step="any"
													/>
												</div>
												<div className="mt-2 flex flex-row items-center justify-between text-sm">
													<Input
														className="h-8 w-20"
														type="number"
														key={filterFields.minMajor.key}
														name={filterFields.minMajor.name}
														defaultValue={filterFields.minMajor.initialValue}
														placeholder="Min."
														step="any"
													/>
													<p>≤</p>
													<p>Major Axis (mm)</p>
													<p>≤</p>
													<Input
														className="h-8 w-20"
														type="number"
														key={filterFields.maxMajor.key}
														name={filterFields.maxMajor.name}
														defaultValue={filterFields.maxMajor.initialValue}
														placeholder="Max."
														step="any"
													/>
												</div>
												<div className="text-sm text-primary/60">
													<p>{filterFields.minMinor.errors}</p>
													<p>{filterFields.maxMinor.errors}</p>
													<p>{filterFields.minMajor.errors}</p>
													<p>{filterFields.maxMajor.errors}</p>
												</div>
												<div className="mt-6 flex flex-row justify-between">
													<Button type="reset" variant="secondary" className="h-8 w-8 p-2">
														<FilterX />
													</Button>
													<Button type="submit" variant="secondary" className="h-8 w-8 p-2">
														<CornerDownLeft />
													</Button>
												</div>
											</Form>
										</FormProvider>
									</div>
								</PopoverContent>
							</Popover>
						</div>
					</div>
					<TabsContent value="minor">
						<DetailSection min={minMinor} max={maxMinor} avg={avgMinor} />
						<Histogram data={dentData.map((dent) => Number(dent.minorAxis))} />
					</TabsContent>
					<TabsContent value="major">
						<DetailSection min={minMajor} max={maxMajor} avg={avgMajor} />
						<Histogram data={dentData.map((dent) => Number(dent.majorAxis))} />
					</TabsContent>
					<TabsContent value="depth">
						<DetailSection avg={depth} />
						{/* <Histogram data={dentData.map((dent) => Number(dent.maxDepth))} /> */}
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
