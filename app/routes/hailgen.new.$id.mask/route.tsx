import { FormProvider, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { eq } from 'drizzle-orm';
import { useEffect, useRef, useState } from 'react';
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
import { hailpad } from '~/db/schema';
import { env } from '~/env.server';
import { protectedRoute } from '~/lib/auth.server';
import { useUploadStatus } from '~/lib/use-upload-status';

export type UploadStatusEventMask = Readonly<{
	id: string;
	maxDepthLocation: number[];
}>;

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

	const depthMapPath = `${env.BASE_URL}/${env.PUBLIC_HAILPAD_DIRECTORY}/${queriedHailpad.folderName}/dmap.png`;

	return json({
		queriedHailpad,
		depthMapPath
	});
}

export async function action({ request, params }: ActionFunctionArgs) {
	return redirect(`/hailgen/${params.id}`);
}

export default function () {
	const navigation = useNavigation();
	const data = useLoaderData<typeof loader>();
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { queriedHailpad, depthMapPath } = data;
	const lastResult = useActionData<typeof action>();

	const status = useUploadStatus<UploadStatusEventMask>(queriedHailpad.id); // Used to handle redirect when service is done processing

	useEffect(() => {
		if (status && status.success) {
			setIsLoading(false);
		}
	}, [status]);

	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!isLoading) {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const context = canvas.getContext('2d');
			if (!context) return;

			// Get depth map image from hailpad folder
			const depthMap = new Image();
			depthMap.src = depthMapPath;

			// Draw depth map
			depthMap.onload = () => {
				context.drawImage(depthMap, 0, 0, 500, 500);
				context.globalAlpha = 1;
			};
		}
	}, [isLoading]);

	return (
		<main className="flex h-full items-center justify-center">
			<Card className="sm:min-w-[500px]">
				<CardHeader>
					<CardTitle>{queriedHailpad.name}</CardTitle>
					<CardDescription>
						Fine-tune the binary mask of the hailpad depth map.
					</CardDescription>
				</CardHeader>
				<div className="flex flex-col gap-4">
					{isLoading ?
						<div>Creating depth map...</div>
						:
						<canvas ref={canvasRef} width={500} height={500} />
					}
				</div>
			</Card>
		</main>
	);
}
