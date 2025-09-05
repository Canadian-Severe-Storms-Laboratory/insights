import { FormProvider, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { Form } from '@remix-run/react';
import { ChevronLeft, ChevronRight, CornerDownLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';

interface HailpadDent {
	id: string;
	angle: string | null;
	centroidX: string;
	centroidY: string;
	majorAxis: string;
	minorAxis: string;
	maxDepth: string;
}

function createDeleteSchema() {
	return z
		.object({
			deleteDentID: z.string()
		});
}

function createUpdateSchema() {
	return z
		.object({
			dentID: z.string(),
			currentBoxfit: z.string(),
			updatedMinor: z.number().min(0, {
				message: 'Minor axis must be positive.'
			}),
			updatedMajor: z.number().min(0, {
				message: 'Major axis must be greater than minor axis.'
			}),
		})
		.refine((data) => data.updatedMajor > data.updatedMinor, {
			path: ['updatedMajor'],
			message: 'Major axis must be greater than minor axis.'
		});
}

function createCreateSchema() {
	return z
		.object({
			currentBoxfit: z.string(),
			currentMaxDepth: z.string(),
			createdMinor: z.number().min(0, {
				message: 'Minor axis must be positive.'
			}),
			createdMajor: z.number().min(0, {
				message: 'Major axis must be greater than minor axis.'
			}),
			createdMaxDepth: z.number().min(0, {
				message: 'Maximum depth must be positive.'
			}),
			createdLocation: z
				.string()
				.refine(
					(value) => {
						const regex = /^\s*\(\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*\)\s*$/;
						return regex.test(value);
					},
					{
						message: 'Dent location must be in the format (x, y).'
					}
				)
				.transform((value) => {
					const regex = /^\s*\(\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*\)\s*$/;
					const match = value.match(regex);
					if (!match) return;
					return [parseFloat(match[1]), parseFloat(match[3])];
				})
		})
		.refine((data) => data.createdMajor > data.createdMinor, {
			path: ['createdMajor'],
			message: 'Major axis must be greater than minor axis.'
		})
		.refine((data) => parseFloat(data.currentMaxDepth) >= data.createdMaxDepth, {
			path: ['createdMaxDepth'],
			message: 'Maximum depth must be less than or equal to the current overall maximum depth.'
		});
}

function Detail({ label, value }: { label: string; value?: string }) {
	return (
		<div className="flex flex-col">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p>{value}</p>
		</div>
	);
}

export default function DentDetails({
	authenticated,
	dentData,
	index,
	currentBoxfit,
	currentMaxDepth,
	onPrevious,
	onNext,
	onIndexChange
}: {
	authenticated: boolean;
	dentData: HailpadDent[];
	index: number;
	currentBoxfit: string;
	currentMaxDepth: string;
	onPrevious?: () => void;
	onNext?: () => void;
	onIndexChange: (index: number) => void;
}) {
	const [minor, setMinor] = useState<number>(0);
	const [major, setMajor] = useState<number>(0);
	const [depth, setDepth] = useState<number>(0);

	const [currentIndex, setCurrentIndex] = useState<number | null>(null);
	const [currentID, setCurrentID] = useState<string | null>(null);

	const [deleteForm, deleteFields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: createDeleteSchema() });
		},
		onSubmit() {
			const formData = new FormData();
			formData.append(deleteFields.deleteDentID.name, deleteFields.deleteDentID.value || '');
		}
	});

	const [updateForm, updateFields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: createUpdateSchema() });
		},
		onSubmit() {
			const formData = new FormData();
			formData.append(updateFields.dentID.name, updateFields.dentID.value || '');
			formData.append(updateFields.currentBoxfit.name, updateFields.currentBoxfit.value || '');
			formData.append(updateFields.updatedMinor.name, updateFields.updatedMinor.value || '');
			formData.append(updateFields.updatedMajor.name, updateFields.updatedMajor.value || '');
		}
	});

	const [createForm, createFields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: createCreateSchema() });
		},
		onSubmit() {
			const formData = new FormData();
			formData.append(createFields.currentBoxfit.name, createFields.currentBoxfit.value || '');
			formData.append(createFields.currentMaxDepth.name, createFields.currentMaxDepth.value || '');
			formData.append(createFields.createdMinor.name, createFields.createdMinor.value || '');
			formData.append(createFields.createdMajor.name, createFields.createdMajor.value || '');
			formData.append(createFields.createdLocation.name, createFields.createdLocation.value || '');
			formData.append(createFields.createdMaxDepth.name, createFields.createdMaxDepth.value || '');
		}
	});

	useEffect(() => {
		if (dentData.length === 0) return;
		setMinor(Number(dentData[index].minorAxis));
		setMajor(Number(dentData[index].majorAxis));
		setDepth(Number(dentData[index].maxDepth));

		setCurrentID(dentData[index].id);
	}, [dentData, index]);

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-row justify-between">
					<div>
						<CardTitle className="mb-2">Dent Details</CardTitle>
						<CardDescription>About the selected dent.</CardDescription>
					</div>
					{authenticated && <div className="flex flex-row justify-end space-x-4">
						<div className="space-x-2">
							<Popover>
								<PopoverTrigger>
									<Button asChild variant="outline" className="h-8 w-8 p-2 hover:text-red-600">
										<Trash2 />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-56">
									<div className="space-y-4">
										<div className="mb-2">
											<p className="text-lg font-semibold">Delete</p>
											<CardDescription className="text-sm">
												Delete the selected dent.
											</CardDescription>
										</div>
										<FormProvider context={deleteForm.context}>
											<Form method="post" id={deleteForm.id} onSubmit={deleteForm.onSubmit}>
												<div className="flex flex-row">
													<Input
														type="hidden"
														key={deleteFields.deleteDentID.key}
														name={deleteFields.deleteDentID.name}
														defaultValue={currentID || ''}
													/>
													<Button
														type="submit"
														variant="secondary"
														className="mt-6 flex h-8 w-full flex-row items-center justify-between space-x-2 p-4 px-3 pr-2 text-sm hover:bg-red-600"
													>
														Delete Dent {index + 1}
														<CornerDownLeft className="h-4 w-4" />
													</Button>
												</div>
											</Form>
										</FormProvider>
									</div>
								</PopoverContent>
							</Popover>
							<Popover>
								<PopoverTrigger>
									<Button asChild variant="outline" className="h-8 w-8 p-2">
										<Pencil />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-76">
									<div className="space-y-4">
										<div className="mb-6">
											<p className="text-lg font-semibold">Update</p>
											<CardDescription className="text-sm">
												Modify the selected dent's details.
											</CardDescription>
										</div>
										<FormProvider context={updateForm.context}>
											<Form method="post" id={updateForm.id} onSubmit={updateForm.onSubmit}>
												<div className="mt-1 flex flex-row items-center">
													<Input
														type="hidden"
														key={updateFields.dentID.key}
														name={updateFields.dentID.name}
														defaultValue={currentID || ''}
													/>
													<Input
														type="hidden"
														key={updateFields.currentBoxfit.key}
														name={updateFields.currentBoxfit.name}
														defaultValue={currentBoxfit || ''}
													/>
													<div className="mr-4 w-48">
														<Label>Minor Axis (mm)</Label>
													</div>
													<Input
														className="h-8 w-24"
														type="number"
														key={updateFields.updatedMinor.key}
														name={updateFields.updatedMinor.name}
														defaultValue={updateFields.updatedMinor.initialValue}
														placeholder={minor.toFixed(2)}
														step="any"
													/>
												</div>
												<div className="mt-2 flex flex-row items-center">
													<div className="mr-4 w-48">
														<Label>Major Axis (mm)</Label>
													</div>
													<Input
														className="h-8 w-24"
														type="number"
														key={updateFields.updatedMajor.key}
														name={updateFields.updatedMajor.name}
														defaultValue={updateFields.updatedMajor.initialValue}
														placeholder={major.toFixed(2)}
														step="any"
													/>
												</div>
												<div className="flex flex-row justify-end items-center">
													<p className="text-sm text-primary/60">{updateFields.updatedMinor.errors}</p>
													<p className="text-sm text-primary/60">{updateFields.updatedMajor.errors}</p>
													<Button type="submit" variant="secondary" className="mt-4 h-8 w-8 p-2 ml-4">
														<CornerDownLeft />
													</Button>
												</div>
											</Form>
										</FormProvider>
									</div>
								</PopoverContent>
							</Popover>
							<Popover>
								<PopoverTrigger>
									<Button asChild variant="outline" className="h-8 w-8 p-2">
										<Plus />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-76">
									<div className="space-y-4">
										<div className="mb-6">
											<p className="text-lg font-semibold">Create</p>
											<CardDescription className="text-sm">
												Save a new dent to the hailpad.
											</CardDescription>
										</div>
										<FormProvider context={createForm.context}>
											<Form method="post" id={createForm.id} onSubmit={createForm.onSubmit}>
												<div className="mt-1 flex flex-row items-center">
													<Input
														type="hidden"
														key={createFields.currentBoxfit.key}
														name={createFields.currentBoxfit.name}
														defaultValue={currentBoxfit || ''}
													/>
													<Input
														type="hidden"
														key={createFields.currentMaxDepth.key}
														name={createFields.currentMaxDepth.name}
														defaultValue={currentMaxDepth || ''}
													/>
													<div className="mr-4 w-48">
														<Label>Minor Axis (mm)</Label>
													</div>
													<Input
														className="h-8 w-28"
														type="number"
														key={createFields.createdMinor.key}
														name={createFields.createdMinor.name}
														defaultValue={createFields.createdMinor.initialValue}
														placeholder="b"
														step="any"
													/>
												</div>
												<div className="mt-2 flex flex-row items-center">
													<div className="mr-4 w-48">
														<Label>Major Axis (mm)</Label>
													</div>
													<Input
														className="h-8 w-28"
														type="number"
														key={createFields.createdMajor.key}
														name={createFields.createdMajor.name}
														defaultValue={createFields.createdMajor.initialValue}
														placeholder="a"
														step="any"
													/>
												</div>
												<div className="mt-2 flex flex-row items-center">
													<div className="mr-4 w-48">
														<Label>Maximum Depth (mm)</Label>
													</div>
													<Input
														className="h-8 w-28"
														type="number"
														key={createFields.createdMaxDepth.key}
														name={createFields.createdMaxDepth.name}
														defaultValue={createFields.createdMaxDepth.initialValue}
														placeholder="h"
														step="any"
													/>
												</div>
												<div className="mt-2 flex flex-row items-center">
													<div className="mr-4 w-48">
														<Label>Dent Location</Label>
													</div>
													<Input
														className="h-8 w-28"
														type="string"
														key={createFields.createdLocation.key}
														name={createFields.createdLocation.name}
														defaultValue={createFields.createdLocation.initialValue}
														placeholder="(x, y)"
														step="any"
													/>
												</div>
												<div className="flex flex-row justify-end items-center">
													<p className="text-sm text-primary/60">{createFields.createdMinor.errors}</p>
													<p className="text-sm text-primary/60">{createFields.createdMajor.errors}</p>
													<p className="text-sm text-primary/60">{createFields.createdMaxDepth.errors}</p>
													<p className="text-sm text-primary/60">{createFields.createdLocation.errors}</p>
													<Button type="submit" variant="secondary" className="mt-4 h-8 w-8 ml-4 p-2">
														<CornerDownLeft />
													</Button>
												</div>
											</Form>
										</FormProvider>
									</div>
								</PopoverContent>
							</Popover>
						</div>
						<div className="space-x-2">
							<Button className="h-8 w-8 p-2" variant="secondary" onClick={() => onPrevious?.()}>
								<ChevronLeft />
							</Button>
							<Button className="h-8 w-8 p-2" variant="secondary" onClick={() => onNext?.()}>
								<ChevronRight />
							</Button>
						</div>
					</div>}
				</div>
			</CardHeader>
			<CardContent>
				<div className="col-span-2">
					<Detail label="Dent" />
					<div className="mt-1 flex flex-row items-center gap-2">
						<Input
							className="h-8 w-20"
							type="number"
							min={1}
							max={dentData.length}
							placeholder={`${index + 1}`}
							onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
						/>
						<p>/</p>
						<p>{`${dentData.length}`}</p>
						<Button
							className="ml-2 h-8 w-8 p-2"
							variant="secondary"
							size="icon"
							onClick={() => {
								onIndexChange(Number(currentIndex) - 1);
								setCurrentIndex(null);
							}}
						>
							<CornerDownLeft />
						</Button>
					</div>
				</div>
				<div className="mt-4 grid grid-cols-3 gap-4">
					<Detail label="Minor Axis" value={`${minor.toFixed(2)} mm`} />
					<Detail label="Major Axis" value={`${major.toFixed(2)} mm`} />
					<Detail label="Maximum Depth" value={`${depth.toFixed(2)} mm`} />
				</div>
			</CardContent>
		</Card>
	);
}
