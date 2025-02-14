import { FormProvider, useForm } from '@conform-to/react';
import { conformZodMessage, parseWithZod } from '@conform-to/zod';
import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { eq } from 'drizzle-orm';
import { Info } from 'lucide-react';
import { mkdir } from 'node:fs/promises';
import { z } from 'zod';
import { BoxfitDiagram } from '~/components/boxfit-diagram';
import { Button } from '~/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { db } from '~/db/db.server';
import { hailpad } from '~/db/schema';
import { protectedRoute } from '~/lib/auth.server';

// Instead of sharing a schema, prepare a schema creator
function createSchema(options?: { isFolderNameUnique: (folderName: string) => Promise<boolean> }) {
	return z.object({
		name: z
			.string()
			.min(3, {
				message: 'Name must be at least 3 characters.'
			})
			.max(255, {
				message: 'Name must be between 3 and 255 characters.'
			}),
		folderName: z
			.string()
			.min(3, {
				message: 'Folder name must be at least 3 characters.'
			})
			.max(255, {
				message: 'Folder name must be between 3 and 255 characters.'
			})
			.regex(/^[a-z0-9_-]+$/, {
				message: 'Must only contain lowercase letters, numbers, hyphens, and underscores.'
			})
			.pipe(
				z.string().superRefine((folderName, ctx) => {
					// This makes Conform to fallback to server validation
					// by indicating that the validation is not defined
					if (typeof options?.isFolderNameUnique !== 'function') {
						ctx.addIssue({
							code: 'custom',
							message: conformZodMessage.VALIDATION_UNDEFINED,
							fatal: true
						});
						return;
					}

					// If it reaches here, then it must be validating on the server
					// Return the result as a promise so Zod knows it's async instead
					return options.isFolderNameUnique(folderName).then((isUnique) => {
						if (!isUnique) {
							ctx.addIssue({
								code: 'custom',
								message: 'Folder name is already used'
							});
						}
					});
				})
			),
		boxfit: z.number().min(0, {
			message: 'Box-fitting length must be positive.'
		})
	});
}

export async function loader({ request }: LoaderFunctionArgs) {
	await protectedRoute(request);
	return null;
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await protectedRoute(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: createSchema({
			async isFolderNameUnique(folderName) {
				const queriedHailpad = await db.query.hailpad.findFirst({
					where: eq(hailpad.folderName, folderName)
				});
				return !queriedHailpad;
			}
		}),
		async: true
	});

	if (submission.status !== 'success') {
		return json(submission.reply());
	}

	const { name, folderName, boxfit } = submission.value;

	const newHailpad = await db
		.insert(hailpad)
		.values({
			name,
			folderName,
			boxfit: Number(boxfit).toString(),
			maxDepth: Number(0).toString(), // Default value
			adaptiveBlockSize: Number(21).toString(), // Default value
			adaptiveC: Number(-4.0).toString(), // Default value
			createdBy: userId,
			updatedBy: userId
		})
		.returning({
			id: hailpad.id,
			folderName: hailpad.folderName
		});

	if (newHailpad.length != 1) {
		throw new Error('Error creating hailpad');
	}

	// Create folder in the HAILPAD_DIRECTORY
	await mkdir(`${process.env.HAILPAD_DIRECTORY}/${newHailpad[0].folderName}`, {
		recursive: true
	});

	return redirect(`/hailgen/new/${newHailpad[0].id}/mesh`);
}

export default function () {
	const lastResult = useActionData<typeof action>();
	const [form, fields] = useForm({
		lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: createSchema() });
		}
	});

	return (
		<main className="flex h-full items-center justify-center">
			<Card className="sm:min-w-[500px]">
				<CardHeader>
					<CardTitle>New Hailpad Scan</CardTitle>
					<CardDescription>Create a new hailpad scan to start analyzing dents.</CardDescription>
				</CardHeader>
				<div className="flex flex-col gap-4">
					<FormProvider context={form.context}>
						<Form method="post" id={form.id} onSubmit={form.onSubmit}>
							<CardContent className="grid gap-2">
								<div>
									<Label htmlFor={fields.name.id}>Name</Label>
									<Input
										key={fields.name.key}
										name={fields.name.name}
										defaultValue={fields.name.initialValue}
										placeholder="Name"
									/>
									<p className="text-sm text-primary/60">{fields.name.errors}</p>
								</div>
								<div>
									<Label htmlFor={fields.folderName.id}>Folder Name</Label>
									<Input
										key={fields.folderName.key}
										name={fields.folderName.name}
										defaultValue={fields.folderName.initialValue}
										placeholder="Folder Name"
									/>
									<p className="text-sm text-primary/60">{fields.folderName.errors}</p>
								</div>
								<div>
									<Label htmlFor={fields.boxfit.id}>
										Box-fitting Length{' '}
										<Popover>
											<PopoverTrigger>
												<Info className="ml-1" size={12} />
											</PopoverTrigger>
											<PopoverContent className="w-[420px]">
												<div className="space-y-4">
													<div className="flex grid-cols-2 gap-2">
														<BoxfitDiagram size={300} className="h-fit" />
														<div className="mb-2 w-fit">
															<p className="text-lg font-semibold">About Box-fitting Length</p>
															<CardDescription className="text-sm">
																The box-fitting length (<span className="italic">l</span>) is the
																largest length of the smallest box that can enclose the hailpad,
																measured in mm. This value is used to map pixel measurements to
																real-world units.
															</CardDescription>
														</div>
													</div>
												</div>
											</PopoverContent>
										</Popover>
									</Label>
									<Input
										type="number"
										key={fields.boxfit.key}
										name={fields.boxfit.name}
										defaultValue={fields.boxfit.initialValue}
										placeholder="Box-fitting Length"
										step="any"
									/>
									<p className="text-sm text-primary/60">{fields.boxfit.errors}</p>
								</div>
							</CardContent>
							<CardFooter>
								<Button type="submit">Next</Button>
							</CardFooter>
						</Form>
					</FormProvider>
				</div>
			</Card>
		</main>
	);
}
