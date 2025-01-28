import { NodeOnDiskFile } from '@remix-run/node';
import { ActionFunctionArgs, unstable_parseMultipartFormData } from '@remix-run/server-runtime';
import { eq } from 'drizzle-orm';
import { db, updatePathSize } from '~/db/db.server';
import { paths, pathSegments } from '~/db/schema';
import { env } from '~/env.server';
import { protectedRoute } from '~/lib/auth.server';
import { buildUploadResponse } from '~/lib/upload-util.server';
import { buildUploadHandler, clearUploads } from './uploader.server';

export async function action({ request, params }: ActionFunctionArgs) {
	if (!params.id) {
		return buildUploadResponse({
			status: 'redirect',
			data: '/360'
		});
	}

	await protectedRoute(request);
	const path = await db.query.paths.findFirst({
		where: eq(paths.id, params.id)
	});

	if (!path) {
		return buildUploadResponse({
			status: 'error',
			data: {
				message: 'Path not found'
			}
		});
	}

	// Check if the number of segments already matches the number of framepos data
	const completedSegments = await db.query.pathSegments.findMany({
		where: eq(pathSegments.pathId, path.id)
	});

	if (completedSegments.length === path.frameposData?.length) {
		return buildUploadResponse({
			status: 'redirect',
			data: `/360/new/${path.id}/google`
		});
	}

	// Clear the uploads if the number of files does not match the number of segments
	await clearUploads(path.folderName, path.id);

	const files: FormDataEntryValue[] = [];
	const uploadHandler = buildUploadHandler({
		path,
		maxFileSize: 50 * 1024 * 1024
	});

	try {
		const formData = await unstable_parseMultipartFormData(request, uploadHandler);
		formData.forEach((value) => {
			files.push(value);
		});
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

			return buildUploadResponse({
				status: 'error',
				data: {
					message: 'Invalid upload. Check server logs'
				}
			});
		}
	}

	if (files.length !== path.frameposData?.length) {
		try {
			await clearUploads(path.folderName, path.id);
		} catch (error) {
			console.error(error);
		}

		return buildUploadResponse({
			status: 'error',
			data: {
				message: `Invalid number of uploads, expected ${path.frameposData?.length} but got ${files.length}`
			}
		});
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

	return buildUploadResponse({
		status: 'redirect',
		data: `/360/new/${path.id}/google`
	});
}
