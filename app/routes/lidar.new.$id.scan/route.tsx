import { parseWithZod } from '@conform-to/zod';
import {
	ActionFunctionArgs,
	json,
	LoaderFunctionArgs,
	NodeOnDiskFile,
	redirect,
	unstable_createFileUploadHandler,
	unstable_parseMultipartFormData
} from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { eq } from 'drizzle-orm';
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
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
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Spinner } from '~/components/ui/spinner';
import { db } from '~/db/db.server';
import { scans } from '~/db/schema';
import { env } from '~/env.server';
import { protectedRoute } from '~/lib/auth.server';

const schema = z.object({
	scan: z
		.instanceof(NodeOnDiskFile, {
			message: 'Please select a pointcloud file.'
		})
		.refine((file) => {
			return file.name.endsWith('.las') || file.name.endsWith('.laz');
		}, 'File should be of .las or .laz type.')
});

export async function loader({ request, params }: LoaderFunctionArgs) {
	const id = params.id;

	if (!id) throw new Response(null, { status: 404, statusText: 'Not found' });

	const scan = await db.query.scans.findFirst({
		where: eq(scans.id, id)
	});

	if (!scan) throw new Response(null, { status: 404, statusText: 'Not found' });

	await protectedRoute(request);

	return json(scan);
}

export async function action({ request, params }: ActionFunctionArgs) {
	await protectedRoute(request);

	const id = params.id;

	if (!id) throw new Response(null, { status: 404, statusText: 'Not found' });

	const scan = await db.query.scans.findFirst({
		where: eq(scans.id, id)
	});

	if (!scan) throw new Response(null, { status: 404, statusText: 'Not found' });

	const directory = `${env.SCAN_DIRECTORY}/${scan.folderName}`;

	const handler = unstable_createFileUploadHandler({
		// 5GB
		maxPartSize: 5 * 1024 * 1024 * 1024,
		filter: (file) => {
			if (!file.filename) return false;
			return file.filename.endsWith('.las') || file.filename.endsWith('.laz');
		},
		directory,
		avoidFileConflicts: false,
		file({ filename }) {
			return `scan.${filename.split('.').pop()}`;
		}
	});

	const formData = await unstable_parseMultipartFormData(request, handler);
	const submission = parseWithZod(formData, { schema });

	const emptyDirectory = async () => {
		// Delete the uploaded file
		try {
			for (const file of await readdir(directory)) await unlink(join(directory, file));
		} catch (error) {
			console.error(error);
		}
	};

	if (submission.status !== 'success') {
		await emptyDirectory();
		return json(submission.reply());
	}

	const file = formData.get('scan') as unknown as NodeOnDiskFile;

	if (!file) {
		await emptyDirectory();
		throw new Error('File not found after uploading...');
	}

	if (env.SERVICE_LIDAR_ENABLED) {
		try {
			const response = await fetch(new URL(`${env.SERVICE_LIDAR_URL}/${scan.id}/process`), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${env.SERVICE_LIDAR_KEY}`
				},
				body: JSON.stringify({
					input: `${env.SERVICE_LIDAR_DIRECTORY}/${scan.folderName}/scan.${file.name.split('.').pop()}`,
					output: `${env.SERVICE_LIDAR_DIRECTORY}/${scan.folderName}/output`
				})
			});

			if (!response.ok) {
				console.error('Failed to connect to LiDAR service', response.statusText);
			}
		} catch (error) {
			console.error('Unable to connect to LiDAR service', error);
		}
	}

	await db
		.update(scans)
		.set({
			status: env.SERVICE_LIDAR_ENABLED ? 'processing' : 'complete',
			size: file.size
		})
		.where(eq(scans.id, id));

	return redirect(`/lidar/${scan.id}`);
}

export default function () {
	const scan = useLoaderData<typeof loader>();
	const lastResult = useActionData<typeof action>();
	const navigation = useNavigation();
	const [fileSelected, setFileSelected] = useState(false);

	return (
		<main className="flex h-full items-center justify-center">
			<Card className="sm:min-w-[500px]">
				<CardHeader>
					<CardTitle>{scan.name}</CardTitle>
					<CardDescription>Upload the scan LAZ or LAS..</CardDescription>
				</CardHeader>
				<Form method="post" encType="multipart/form-data">
					<CardContent>
						<fieldset className="grid gap-2" disabled={navigation.state === 'submitting'}>
							<Label htmlFor="images">Scan File</Label>
							<Input
								type="file"
								key="scan"
								name="scan"
								onChange={(e) => setFileSelected(e.target.files?.length === 1 ? true : false)}
								required
							/>
							{lastResult && lastResult.status === 'error' && (
								<p className="text-sm text-primary/60">{lastResult.error?.['scan']}</p>
							)}
						</fieldset>
					</CardContent>
					<CardFooter className="space-x-4">
						<Button type="submit" disabled={navigation.state === 'submitting' || !fileSelected}>
							{navigation.state === 'submitting' && (
								<Spinner className="mr-2 fill-primary" size={16} />
							)}
							{navigation.state === 'submitting' ? 'Uploading...' : 'Upload'}
						</Button>
					</CardFooter>
				</Form>
			</Card>
		</main>
	);
}
