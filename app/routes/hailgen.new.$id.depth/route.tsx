import { FormProvider, useForm } from '@conform-to/react';
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
import { useEffect, useRef } from 'react';
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
import { db } from '~/db/db.server';
import { dent, hailpad } from '~/db/schema';
import { env } from '~/env.server';
import { authenticator, protectedRoute } from '~/lib/auth.server';

// Instead of sharing a schema, prepare a schema creator
function createSchema() {
	return z.object({
		depth: z.number().min(0, {
			message: 'Maximum depth must be positive.'
		})
	});
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectedRoute(request);

	const url = new URL(request.url);

	if (!params.id) {
		return redirect('/hailgen');
	}

	const queriedHailpad = await db.query.hailpad.findFirst({
		where: eq(hailpad.id, params.id)
	});

	if (!queriedHailpad) {
		throw new Error('Hailpad not found');
	}

	const depthMapPath = `${env.BASE_URL}/${env.PUBLIC_HAILPAD_DIRECTORY}/${queriedHailpad.folderName}/dmap.png`;

	return json({
		queriedHailpad,
		depthMapPath,
		x: url.searchParams.get("x"),
		y: url.searchParams.get("y")
	});
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await protectedRoute(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: createSchema(),
		async: true
	});

	if (submission.status !== 'success') {
		return json(submission.reply());
	}

	const { depth } = submission.value;

	const updatedHailpad = await db
		.update(hailpad)
		.set({
			maxDepth: String(depth),
			updatedBy: userId,
			updatedAt: new Date()
		})
		.where(eq(hailpad.id, String(params.id)))
		.returning({
			id: hailpad.id
		});

	if (updatedHailpad.length != 1) {
		throw new Error('Error updating hailpad with max. depth');
	}

	return redirect(`/hailgen/${params.id}`);
}

export default function () {
	const navigation = useNavigation();
	const data = useLoaderData<typeof loader>();
	const { queriedHailpad, depthMapPath, x, y } = data;
	const lastResult = useActionData<typeof action>();
	const [form, fields] = useForm({
		lastResult,
		shouldValidate: 'onSubmit',
		shouldRevalidate: 'onSubmit'
	});

	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const context = canvas.getContext('2d');
		if (!context) return;

		// Get depth map image from hailpad folder
		const depthMap = new Image();
		depthMap.src = depthMapPath;

		// Draw depth map and mark max. depth
		depthMap.onload = () => {
			context.fillStyle = '#8F55E0'; // TODO: Use a theme color
			context.drawImage(depthMap, 0, 0, 1000, 1000);
			context.globalAlpha = 1;
			context.beginPath();
			context.arc(Number(x), Number(y), 7, 0, 2 * Math.PI);
			context.fill();
			context.globalAlpha = 1;
		};
	}, []);

	return (
		<main className="flex h-full items-center justify-center">
			<Card className="sm:min-w-[500px]">
				<CardHeader>
					<CardTitle>{queriedHailpad.name}</CardTitle>
					<CardDescription>The following region was identified to contain the greatest depth relative to the rest of the hailpad. Enter the mm measurement of this depth.</CardDescription>
				</CardHeader>
				<div className="flex flex-col gap-4">
					<canvas ref={canvasRef} width={1000} height={1000} />
					<FormProvider context={form.context}>
						<Form method="post" id={form.id} onSubmit={form.onSubmit}>
							<CardContent className="flex flex-row gap-4 items-center">
								<div>
									<Label htmlFor={fields.depth.id}>Maximum Depth</Label>
									<Input
										key={fields.depth.key}
										name={fields.depth.name}
										// defaultValue={fields.depth.initialValue}
										placeholder="Maximum Depth"
									/>
									<p className="text-sm text-primary/60">{fields.depth.errors}</p>
								</div>
							</CardContent>
							<CardFooter>
								<Button type="submit">Finish</Button>
							</CardFooter>
						</Form>
					</FormProvider>
				</div>
			</Card>
		</main>
	);
}
