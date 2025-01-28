import { json, LoaderFunctionArgs, redirect } from '@remix-run/node';
import { useLoaderData, useNavigation } from '@remix-run/react';
import axios, { AxiosError } from 'axios';
import { eq } from 'drizzle-orm';
import { LucideLink } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
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
import { paths } from '~/db/schema';
import { protectedRoute } from '~/lib/auth.server';
import { unknownError, UploadResponse } from '~/lib/upload-types';

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

	if (path.status === 'framepos') {
		return redirect('/360');
	}

	return json(path);
}

export default function () {
	const navigation = useNavigation();
	const path = useLoaderData<typeof loader>();
	const [copyClicked, setCopyClicked] = useState(false);
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

				const response = await axios({
					method: 'post',
					url: `/360/new/${path.id}/google/upload`,
					data: formData,
					headers: {
						'Content-Type': 'multipart/form-data'
					},
					onUploadProgress: (progressEvent) => {
						console.info(progressEvent);
						const percentCompleted = progressEvent.lengthComputable
							? progressEvent.progress || 0 * 100
							: 0;
						setUploadProgress({
							percentage: percentCompleted,
							submitting: true
						});
					}
				});

				// Status is 303, redirect to the next page
				if (response.status === 303) {
					window.location.href = response.headers.location;
					return;
				}

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
					<CardDescription>Upload the images downloaded from Google.</CardDescription>
				</CardHeader>
				<form onSubmit={upload}>
					<CardContent className="grid grid-cols-1 gap-2">
						<fieldset className="grid gap-2" disabled={navigation.state === 'submitting'}>
							<Label htmlFor="images">Copy Panorama IDs to download.</Label>
							<Button
								variant="link"
								className="w-min flex-row gap-2"
								onClick={() => {
									const panoramaIds = Object.keys(
										path.panoramaData as Record<string, unknown>
									).join('\n');
									navigator.clipboard.writeText(panoramaIds);
									toast('Panorama IDs copied to clipboard.', { duration: 3000 });
									setCopyClicked(true);
								}}
							>
								<LucideLink size={16} /> Copy
							</Button>
						</fieldset>
						<fieldset
							className="grid gap-2"
							disabled={navigation.state === 'submitting' || !copyClicked}
						>
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
								<p className="text-sm text-primary/60">{lastResult.error?.['message']}</p>
							)}
						</fieldset>
					</CardContent>
					<CardFooter className="space-x-4">
						<Button type="submit" disabled={navigation.state === 'submitting' || !copyClicked}>
							{navigation.state === 'submitting' && (
								<Spinner className="mr-2 fill-primary" size={16} />
							)}
							{uploadProgress.submitting ? `${uploadProgress.percentage.toFixed(4)}%` : 'Upload'}
						</Button>
						{images.length !== Object.keys(path.panoramaData as Record<string, unknown>).length && (
							<p className="text-sm text-primary/60">
								{images.length} images selected,{' '}
								{Object.keys(path.panoramaData as Record<string, unknown>).length} recommended
							</p>
						)}
					</CardFooter>
				</form>
			</Card>
		</main>
	);
}
