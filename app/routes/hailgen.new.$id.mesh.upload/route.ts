import { parseWithZod } from '@conform-to/zod';
import { ActionFunctionArgs, unstable_parseMultipartFormData } from '@remix-run/node';
import { eq } from 'drizzle-orm';
import { db } from '~/db/db.server';
import { hailpad } from '~/db/schema';
import { env } from '~/env.server';
import { protectedRoute } from '~/lib/auth.server';
import { buildUploadResponse } from '~/lib/upload-util.server';
import UploadSchema from './schema';
import { buildUploadHandler } from './uploader.server';

export async function action({ request, params }: ActionFunctionArgs) {
	await protectedRoute(request);

	if (!params.id) {
		return buildUploadResponse({
			status: 'redirect',
			data: '/hailgen'
		});
	}

	const queriedHailpad = await db.query.hailpad.findFirst({
		where: eq(hailpad.id, params.id)
	});

	if (!queriedHailpad) {
		return buildUploadResponse({
			status: 'error',
			data: { message: 'Hailpad not found' }
		});
	}

	const formData = await unstable_parseMultipartFormData(
		request,
		buildUploadHandler({ pad: queriedHailpad })
	);

	const pairAnalysis = formData.get('pairAnalysis') === 'true';
	const submission = parseWithZod(formData, { schema: UploadSchema });

	if (submission.status !== 'success') {
		console.error(submission.error);
		return buildUploadResponse({
			status: 'error',
			data: { message: 'Invalid submission, check the files' }
		});
	}

	// Invoke microservice with uploaded file path for processing
	if (env.SERVICE_HAILGEN_ENABLED) {
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
			return buildUploadResponse({
				status: 'error',
				data: {
					message: 'Failed to process the uploaded files. Check that the Hailgen is running!'
				}
			});
		}
	}

	return buildUploadResponse({
		status: 'redirect',
		data: `/hailgen/new/${params.id}/depth`
	});
}
