import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	NodeOnDiskFile,
	json,
	redirect,
	unstable_createFileUploadHandler,
	unstable_parseMultipartFormData
} from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { eq } from 'drizzle-orm';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '~/components/ui/card';
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '~/components/ui/popover';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { db } from '~/db/db.server';
import { hailpad } from '~/db/schema';
import { env } from '~/env.server';
import { protectedRoute } from '~/lib/auth.server';
import { Info } from 'lucide-react';

const schema = z.object({
	pairAnalysis: z.boolean(),
	postMesh: z
		.instanceof(NodeOnDiskFile, {
			message: 'Please select a .stl file.'
		})
		.refine((file) => {
			return file.name.endsWith('.stl');
		}, 'File should be of .stl type.')
}).refine((data) => {
	if (data.pairAnalysis) {
		return z.object({
			preMesh: z
				.instanceof(NodeOnDiskFile, {
					message: 'Please select a .stl file.'
				})
				.refine((file) => {
					return file.name.endsWith('.stl');
				}, 'File should be of .stl type.')
		}).safeParse(data).success;
	}
	return true;
}, {
	message: 'Please select a .stl file for the pre-hit mesh.',
	path: ['preMesh']
});

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectedRoute(request);

	if (!params.id) {
		return redirect('/hailgen');
	}

	const queriedHailpad = await db.query.hailpad.findFirst({
		where: eq(hailpad.id, params.id)
	});

	if (!queriedHailpad) {
		throw new Error('Hailpad not found');
	}

	return json(queriedHailpad);
}

export async function action({ request, params }: ActionFunctionArgs) {
	await protectedRoute(request);

	if (!params.id) {
		return redirect('/hailgen');
	}

	const queriedHailpad = await db.query.hailpad.findFirst({
		where: eq(hailpad.id, params.id)
	});

	if (!queriedHailpad) {
		throw new Error('Hailpad not found');
	}

	const filePath = `${env.HAILPAD_DIRECTORY}/${queriedHailpad.folderName}`;

	const handler = unstable_createFileUploadHandler({
		maxPartSize: 1024 * 1024 * 100,
		filter: (file) => {
			if (!file.filename) return false;
			return file.filename.endsWith('.stl');
		},
		directory: filePath,
		avoidFileConflicts: false,
		file({ name }) {
			if (name === 'preMesh') {
				return 'pre-hailpad.stl';
			} else if (name === 'postMesh') {
				return 'post-hailpad.stl';
			}
			return name;
		}
	});

	const formData = await unstable_parseMultipartFormData(request, handler);
	let pairAnalysis = formData.get('pairAnalysis') === 'true';

	const data = new FormData();
	data.append('pairAnalysis', pairAnalysis.toString());
	data.append('postMesh', formData.get('postMesh') as Blob);
	if (pairAnalysis) {
		data.append('preMesh', formData.get('preMesh') as Blob);
	}

	const submission = parseWithZod(data, { schema });

	if (submission.status !== 'success') {
		return json(submission.reply());
	}

	// Save the mesh(es) to the associated hailpad folder
	const preFile = formData.get('preMesh') as unknown as NodeOnDiskFile;
	const postFile = formData.get('postMesh') as unknown as NodeOnDiskFile;


	if (!preFile || !postFile) {
		throw new Error('Could not read the file(s).');
	}

	// Invoke microservice with uploaded file path for processing
	// if (env.SERVICE_HAILGEN_ENABLED) {
	try {
		if (pairAnalysis) {
			await fetch(new URL(`${process.env.SERVICE_HAILGEN_URL}/hailgen/dmap/pair`), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					hailpad_id: params.id,
					pre_path: `${env.SERVICE_HAILGEN_DIRECTORY}/${queriedHailpad.folderName}/pre-hailpad.stl`,
					post_path: `${env.SERVICE_HAILGEN_DIRECTORY}/${queriedHailpad.folderName}/post-hailpad.stl`
				})
			});
		} else {
			await fetch(new URL(`${process.env.SERVICE_HAILGEN_URL}/hailgen/dmap/single`), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					hailpad_id: params.id,
					post_path: `${env.SERVICE_HAILGEN_DIRECTORY}/${queriedHailpad.folderName}/hailpad.stl`
				})
			});
		}
	} catch (error) {
		console.error(error);
	}

	return new Response(null);
}

export default function () {
	const navigation = useNavigation();
	const hailpad = useLoaderData<typeof loader>();
	const lastResult = useActionData<typeof action>();
	const [form, fields] = useForm({
		lastResult,
		shouldValidate: 'onSubmit',
		shouldRevalidate: 'onSubmit'
	});

	const [performingAnalysis, setPerformingAnalysis] = useState<boolean>(false);
	const [pairAnalysis, setPairAnalysis] = useState<boolean>(false);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		setPerformingAnalysis(true);

		if (form.onSubmit) {
			await form.onSubmit(event);
		}
	};

	return (
		<main className="flex h-full items-center justify-center">
			<Card className="sm:min-w-[500px]">
				<CardHeader>
					<CardTitle>{hailpad.name}</CardTitle>
					<CardDescription>Configure the analysis and upload the corresponding 3D hailpad mesh(es).</CardDescription>
				</CardHeader>
				<Form
					method="post"
					encType="multipart/form-data"
					id={form.id}
					onSubmit={handleSubmit}
					noValidate
				>
					<input type="hidden" name="pairAnalysis" value={pairAnalysis.toString()} />
					<CardContent className="grid gap-2">
						<div className="flex flex-row space-x-2 pt-2">
							<Label htmlFor="analysis-type">Process Type</Label>
							<Popover>
								<PopoverTrigger>
									<Info size={12} />
								</PopoverTrigger>
								<PopoverContent className="w-[420px]">
									<div className="space-y-4">
										<div className="flex grid-cols-2 gap-2">
											<div className="w-fit mb-2">
												<p className="text-lg font-semibold">About Process Type</p>
												<CardDescription className="flex flex-col space-y-2 text-sm">
													<span>
														<span className="font-semibold">Single hailpad analysis</span> uses a adaptive thresholding techniques to isolate significiant, likely dent cluster regions from the comparitively shallower background. The thresholding parameters can be manually fine-tuned before performing the analysis.
													</span>
													<span>
														<span className="font-semibold">Hailpad pair analysis</span> uses pre-hit and post-hit hailpad mesh pairs to separate dent shapes from the background by normalizing the depth map of the pre-hit hailpad based on the maximum depth of the post-hit hailpad and subtracting the pre-hit depth map from the post-hit depth map.
													</span>
												</CardDescription>
											</div>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</div>
						<div id="analysis-type" className="flex flex-col text-sm">
							<label>
								<input
									type="radio"
									value="single"
									checked={pairAnalysis == false}
									onChange={(e) => setPairAnalysis(e.target.value === "pair")}
									className="mr-2"
								/>
								Single hailpad
							</label>
							<label className="flex flex-row space-x-2">
								<input
									type="radio"
									value="pair"
									checked={pairAnalysis == true}
									onChange={(e) => setPairAnalysis(e.target.value === "pair")}
									className="mr-2"
								/>
								Hailpad pair
							</label>
						</div>
						{pairAnalysis == true &&
							<>
								<Label htmlFor="pre-mesh" className="mt-4">Pre-hit Mesh</Label>
								<Input
									type="file"
									id="pre-mesh"
									key={fields.preMesh.key}
									name={fields.preMesh.name}
									accept=".stl"
									required
									disabled={performingAnalysis}
								/>
							</>
						}
						<Label htmlFor="post-mesh" className="mt-4">Post-hit Mesh</Label>
						<Input
							type="file"
							id="post-mesh"
							key={fields.postMesh.name}
							name={fields.postMesh.name}
							accept=".stl"
							required
							disabled={performingAnalysis}
						/>
						<p className="text-sm text-primary/60">{fields.mesh.errors}</p>
					</CardContent>
					<CardFooter>
						<Button type="submit" disabled={!!fields.mesh.errors || performingAnalysis}>
							{performingAnalysis ? 'Creating and processing depth map...' : 'Next'}
						</Button>
					</CardFooter>
				</Form>
			</Card>
		</main>
	);
}
