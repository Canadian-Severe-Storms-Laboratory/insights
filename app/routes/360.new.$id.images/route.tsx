import { LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import axios, { AxiosError } from 'axios';
import { eq } from 'drizzle-orm';
import React, { useCallback, useState } from 'react';
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
import { Spinner } from '~/components/ui/spinner';
import { db } from '~/db/db.server';
import { pathSegments, paths } from '~/db/schema';
import { protectedRoute } from '~/lib/auth.server';
import { UploadResponse, unknownError } from '~/lib/upload-types';

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectedRoute(request);

	if (!params.id) {
		return redirect('/360');
	}

	const path = await db.query.paths.findFirst({
		where: eq(paths.id, params.id)
	});

	if (!path) {
		throw new Error('Path not found');
	}

	if (path.status === 'processing' || path.status === 'framepos') {
		return redirect('/360');
	}

	// Check if the number of segments already matches the number of framepos data
	const completedSegments = await db.query.pathSegments.findMany({
		where: eq(pathSegments.pathId, path.id)
	});

	if (completedSegments.length === path.frameposData?.length) {
		return redirect(`/360/new/${path.id}/google`);
	}

	return json(path);
}

export default function () {
	const navigate = useNavigate();
	const path = useLoaderData<typeof loader>();
	const [images, setImages] = useState<File[]>([]);
	const [lastResult, setLastResult] = useState<UploadResponse | null>(null);
	const [uploadProgress, setUploadProgress] = useState({
		percentage: 0,
		submitting: false
	});

	const upload = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();

			// Use axios to upload the images without refreshing the page or timing out
			const formData = new FormData();
			images.forEach((image) => formData.append(image.name, image));

			try {
				setUploadProgress({
					percentage: 0,
					submitting: true
				});

				const response = await axios<UploadResponse>({
					method: 'post',
					url: `/360/new/${path.id}/images/upload`,
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
				return setLastResult(unknownError);
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
				setUploadProgress({
					percentage: 0,
					submitting: false
				});
			}
		},
		[images]
	);

	return (
		<main className="flex h-full items-center justify-center">
			<Card className="sm:min-w-[500px]">
				<CardHeader>
					<CardTitle>{path.name}</CardTitle>
					<CardDescription>Upload the images captured from the camera.</CardDescription>
				</CardHeader>
				<form onSubmit={upload}>
					<CardContent>
						<fieldset className="grid gap-2" disabled={uploadProgress.submitting}>
							<Label htmlFor="images">Images</Label>
							<Input
								type="file"
								accept="image/png, image/jpeg"
								key="images"
								name="images"
								onChange={(event) => {
									const files = Array.from(event.target.files || []);
									setImages(files);
								}}
								multiple
								required
							/>
							{lastResult && lastResult.status === 'error' && (
								<p className="text-sm text-primary/60">{lastResult.error.message}</p>
							)}
						</fieldset>
					</CardContent>
					<CardFooter className="space-x-4">
						<Button
							type="submit"
							disabled={images.length !== path.frameposData?.length || uploadProgress.submitting}
						>
							{uploadProgress.submitting && <Spinner className="mr-2 fill-primary" size={16} />}
							{uploadProgress.submitting ? `${uploadProgress.percentage.toFixed(4)}%` : 'Upload'}
						</Button>
						{images.length !== path.frameposData?.length && (
							<p className="text-sm text-primary/60">
								{images.length} images selected, {path.frameposData?.length} required
							</p>
						)}
					</CardFooter>
				</form>
			</Card>
		</main>
	);
}
