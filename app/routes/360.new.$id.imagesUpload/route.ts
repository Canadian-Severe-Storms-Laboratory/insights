import { NodeOnDiskFile } from '@remix-run/node';
import {
	ActionFunctionArgs,
	json,
	redirect,
	unstable_parseMultipartFormData
} from '@remix-run/server-runtime';
import { eq } from 'drizzle-orm';
import { db, updatePathSize } from '~/db/db.server';
import { paths, pathSegments } from '~/db/schema';
import { env } from '~/env.server';
import { protectedRoute } from '~/lib/auth.server';
import { buildUploadHandler, clearUploads } from './uploader.server';

export async function action({ request, params }: ActionFunctionArgs) {
	if (!params.id) {
		return redirect('/360');
	}

	await protectedRoute(request);
	const path = await db.query.paths.findFirst({
		where: eq(paths.id, params.id)
	});

	if (!path) {
		throw new Error('Path not found');
	}

	// Check if the number of segments already matches the number of framepos data
	const completedSegments = await db.query.pathSegments.findMany({
		where: eq(pathSegments.pathId, path.id)
	});

	if (completedSegments.length === path.frameposData?.length) {
		return redirect(`/360/new/${path.id}/google`);
	}

	// Clear the uploads if the number of files does not match the number of segments
	await clearUploads(path.folderName, path.id);

	const files: FormDataEntryValue[] = [];

	try {
		const formData = await unstable_parseMultipartFormData(
			request,
			buildUploadHandler({
				path,
				maxFileSize: 50 * 1024 * 1024
			})
		);

		files.push(...formData.getAll('images'));
	} catch (error) {
		console.error(error);
		await clearUploads(path.folderName, path.id);
	}

	for (const file of files) {
		if (!file) {
			try {
				await clearUploads(path.folderName, path.id);
			} catch (error) {
				console.error(error);
			}

			return json(
				{
					status: 'error',
					error: {
						files: 'Invalid upload'
					}
				},
				{
					status: 400
				}
			);
		}
	}

	if (files.length !== path.frameposData?.length) {
		try {
			await clearUploads(path.folderName, path.id);
		} catch (error) {
			console.error(error);
		}

		return json(
			{
				status: 'error',
				error: {
					files: 'Invalid number of files'
				}
			},
			{
				status: 400
			}
		);
	}

	await updatePathSize(path.id);

	const imageFiles: string[] = files.map(
		(file) => (file as unknown as NodeOnDiskFile).getFilePath().split('/').pop()!
	);

	// Send files to microservice
	if (env.SERVICE_360_ENABLED) {
		try {
			await fetch(new URL(`${process.env.SERVICE_360_URL}/process_images`), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					input_directory: `${env.SERVICE_360_DIRECTORY}/${path.folderName}`,
					event_id: path.id,
					file_list: imageFiles
				})
			});
		} catch (e) {
			console.error("Couldn't send images to the 360 service", e);
		}
	} else console.log('Service 360 is disabled');

	return redirect(`/360/new/${path.id}/google`);
}
