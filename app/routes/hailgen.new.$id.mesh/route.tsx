import { json, LoaderFunctionArgs, redirect } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import axios, { AxiosError } from 'axios';
import { eq } from 'drizzle-orm';
import { Info } from 'lucide-react';
import { useCallback, useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Spinner } from '~/components/ui/spinner';
import { db } from '~/db/db.server';
import { hailpad } from '~/db/schema';
import { protectedRoute } from '~/lib/auth.server';
import { unknownError, UploadResponse } from '~/lib/upload-types';

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

export default function () {
	const navigate = useNavigate();
	const hailpad = useLoaderData<typeof loader>();
	const [fields, setFields] = useState<{
		preMesh?: File;
		postMesh?: File;
		pairAnalysis: boolean;
	}>({
		pairAnalysis: false
	});
	const [lastResult, setLastResult] = useState<UploadResponse | null>(null);
	const [uploadProgress, setUploadProgress] = useState({
		percentage: 0,
		submitting: false
	});

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			const formData = new FormData();
			formData.append('pairAnalysis', fields.pairAnalysis.toString());
			formData.append('postMesh', fields.postMesh as Blob);
			if (fields.pairAnalysis) {
				formData.append('preMesh', fields.preMesh as Blob);
			}

			try {
				setUploadProgress({ percentage: 0, submitting: true });

				const response = await axios<UploadResponse>({
					method: 'POST',
					url: `/hailgen/new/${hailpad.id}/mesh/upload`,
					data: formData,
					headers: {
						'Content-Type': 'multipart/form-data'
					},
					onUploadProgress: (progressEvent) => {
						const percentCompleted = progressEvent.lengthComputable
							? progressEvent.progress || 0 * 100
							: 0;
						setUploadProgress({
							percentage: percentCompleted,
							submitting: true
						});
					}
				});

				// Status is 200, redirect to the next page
				if (response.status === 200 && response.data.status === 'redirect')
					return navigate(response.headers.Location || response.data.to);

				// Unknown status
				console.info(response);
				setLastResult(unknownError);
			} catch (error: AxiosError | unknown) {
				if (error instanceof AxiosError) {
					const response = error.response;
					if (!response) return setLastResult(unknownError);
					if (response.status === 400) return setLastResult(response.data);
					if (response.status === 413) {
						return setLastResult({
							status: 'error',
							error: {
								message: 'Upload size too large'
							}
						});
					}
					return setLastResult(unknownError);
				}

				return setLastResult(unknownError);
			} finally {
				setUploadProgress({ percentage: 0, submitting: false });
				setFields((fields) => ({
					...fields,
					preMesh: undefined,
					postMesh: undefined
				}));
			}
		},
		[fields]
	);

	return (
		<main className="flex h-full items-center justify-center">
			<Card className="sm:min-w-[500px]">
				<CardHeader>
					<CardTitle>{hailpad.name}</CardTitle>
					<CardDescription>
						Configure the analysis and upload the corresponding 3D hailpad mesh(es).
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
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
											<div className="mb-2 w-fit">
												<p className="text-lg font-semibold">About Process Type</p>
												<CardDescription className="flex flex-col space-y-2 text-sm">
													<span>
														<span className="font-semibold">Single hailpad analysis</span> uses a
														adaptive thresholding techniques to isolate significiant, likely dent
														cluster regions from the comparitively shallower background. The
														thresholding parameters can be manually fine-tuned before performing the
														analysis.
													</span>
													<span>
														<span className="font-semibold">Hailpad pair analysis</span> uses
														pre-hit and post-hit hailpad mesh pairs to separate dent shapes from the
														background by normalizing the depth map of the pre-hit hailpad based on
														the maximum depth of the post-hit hailpad and subtracting the pre-hit
														depth map from the post-hit depth map.
													</span>
												</CardDescription>
											</div>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</div>
						<RadioGroup
							value={fields.pairAnalysis ? 'pair' : 'single'}
							onValueChange={(v) =>
								setFields((fields) => ({ ...fields, pairAnalysis: v === 'pair' }))
							}
							className="text-sm"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="single" id="single" />
								<Label htmlFor="single">Single hailpad</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="pair" id="pair" />
								<Label htmlFor="pair">Hailpad pair</Label>
							</div>
						</RadioGroup>
						{fields.pairAnalysis && (
							<>
								<Label htmlFor="pre-mesh" className="mt-4">
									Pre-hit Mesh
								</Label>
								<Input
									type="file"
									id="pre-mesh"
									key="preMesh"
									name="preMesh"
									accept=".stl"
									required
									disabled={uploadProgress.submitting}
									onChange={(e) =>
										setFields((fields) => ({ ...fields, preMesh: e.target.files?.[0] }))
									}
								/>
							</>
						)}
						<Label htmlFor="post-mesh" className="mt-4">
							Post-hit Mesh
						</Label>
						<Input
							type="file"
							id="post-mesh"
							key="postMesh"
							name="postMesh"
							accept=".stl"
							required
							disabled={uploadProgress.submitting}
							onChange={(e) =>
								setFields((fields) => ({ ...fields, postMesh: e.target.files?.[0] }))
							}
						/>
						{lastResult && lastResult.status === 'error' && (
							<p className="text-sm text-primary/60">{lastResult.error?.['message']}</p>
						)}
					</CardContent>
					<CardFooter>
						<Button
							type="submit"
							disabled={
								!fields.postMesh ||
								(fields.pairAnalysis && !fields.preMesh) ||
								uploadProgress.submitting
							}
						>
							{uploadProgress.submitting && <Spinner className="mr-2 fill-primary" size={16} />}
							{uploadProgress.submitting
								? `Creating and processing depth map... (${(uploadProgress.percentage * 100).toFixed(1)}%)`
								: 'Next'}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</main>
	);
}
