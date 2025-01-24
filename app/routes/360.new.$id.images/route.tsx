import { LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { useLoaderData, useNavigation } from '@remix-run/react';
import axios, { AxiosError } from 'axios';
import { eq } from 'drizzle-orm';
import { useCallback, useState } from 'react';
import { UploadProgress } from '~/components/progress';
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

type ImageError = {
	status: 'error';
	error: {
		files: string;
	};
};

const unknownError: ImageError = {
	status: 'error',
	error: {
		files: 'Unknown error. Check server logs'
	}
};

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
	const navigation = useNavigation();
	const path = useLoaderData<typeof loader>();
	const [images, setImages] = useState<File[]>([]);
	const [lastResult, setLastResult] = useState<ImageError | null>(null);

	const upload = useCallback(async () => {
		// Use axios to upload the images without refreshing the page or timing out
		const formData = new FormData();
		images.forEach((image) => {
			formData.append('images', image);
		});

		try {
			const response = await axios({
				method: 'post',
				url: `/360/new/${path.id}/imagesUpload`,
				data: formData,
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			});

			// Read redirect from the response headers
			const redirectUrl = response.headers['x-remix-location'];
			if (redirectUrl) return (window.location = redirectUrl);
			return window.location.reload();
		} catch (error: AxiosError | unknown) {
			if (error instanceof AxiosError) {
				const response = error.response;
				if (!response) return setLastResult(unknownError);
				if (response.status === 400) return setLastResult(response.data);
				return setLastResult(unknownError);
			}

			return setLastResult(unknownError);
		}
	}, [images]);

	return (
		<main className="flex h-full items-center justify-center">
			<Card className="sm:min-w-[500px]">
				<CardHeader>
					<CardTitle>{path.name}</CardTitle>
					<CardDescription>Upload the images captured from the camera.</CardDescription>
				</CardHeader>
				<div>
					<CardContent>
						<fieldset className="grid gap-2" disabled={navigation.state === 'submitting'}>
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
							{lastResult && (
								<p className="text-sm text-primary/60">{lastResult.error?.['files']}</p>
							)}
						</fieldset>
						<UploadProgress id={path.id} className="pt-2" />
					</CardContent>
					<CardFooter className="space-x-4">
						<Button
							type="submit"
							disabled={
								navigation.state === 'submitting' || images.length !== path.frameposData?.length
							}
							onClick={upload}
						>
							{navigation.state === 'submitting' && (
								<Spinner className="mr-2 fill-primary" size={16} />
							)}
							{navigation.state === 'submitting' ? 'Uploading...' : 'Upload'}
						</Button>
						{images.length !== path.frameposData?.length && (
							<p className="text-sm text-primary/60">
								{images.length} images selected, {path.frameposData?.length} required
							</p>
						)}
					</CardFooter>
				</div>
			</Card>
		</main>
	);
}
