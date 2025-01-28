import { ActionFunctionArgs, unstable_parseMultipartFormData } from '@remix-run/node';
import { eq } from 'drizzle-orm';
import { db, updatePathSize } from '~/db/db.server';
import { paths } from '~/db/schema';
import { env } from '~/env.server';
import { protectedRoute } from '~/lib/auth.server';
import { buildUploadResponse } from '~/lib/upload-util.server';
import { buildUploadHandler, clearUploads } from './uploader.server';

export async function action({ params, request }: ActionFunctionArgs) {
	if (!params.id)
		return buildUploadResponse({
			status: 'redirect',
			data: '/360'
		});

	await protectedRoute(request);
	const path = await db.query.paths.findFirst({
		where: eq(paths.id, params.id)
	});

	if (!path)
		return buildUploadResponse({
			status: 'error',
			data: { message: 'Path not found' }
		});

	// Delete old panorama files
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
				data: { message: 'Invalid number of files' }
			});
		}
	}

	if (
		files.length === 0 ||
		files.length > Object.keys(path.panoramaData as Record<string, unknown>).length
	) {
		try {
			await clearUploads(path.folderName, path.id);
		} catch (error) {
			console.error(error);
		}

		return buildUploadResponse({
			status: 'error',
			data: { message: `Invalid number of files, uploaded ${files.length}` }
		});
	}

	await updatePathSize(path.id);

	// Set status to processing
	await db
		.update(paths)
		.set({
			status: env.SERVICE_360_ENABLED ? 'processing' : 'complete'
		})
		.where(eq(paths.id, path.id));

	return buildUploadResponse({
		status: 'redirect',
		data: `/360/${path.id}`
	});
}
