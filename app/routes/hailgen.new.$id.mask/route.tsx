import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { eq } from 'drizzle-orm';
import { useEffect, useRef, useState } from 'react';
import LoadingIndicator from '~/components/ui/loading-indicator';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '~/components/ui/card';
import { db } from '~/db/db.server';
import { hailpad } from '~/db/schema';
import { env } from '~/env.server';
import { protectedRoute } from '~/lib/auth.server';
import { useUploadStatus } from '~/lib/use-upload-status';
import { Label } from '~/components/ui/label';
import { Slider } from '~/components/ui/slider';
import { Button } from '~/components/ui/button';
import cv from "@techstark/opencv-js";
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Info } from 'lucide-react';

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
	const data = useLoaderData<typeof loader>();
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { queriedHailpad, depthMapPath } = data;

	const [adaptiveBlockSliderValue, setAdaptiveBlockSliderValue] = useState<number>(17);
	const [adaptiveCSliderValue, setAdaptiveCSliderValue] = useState<number>(0);

	// TODO: Implement more robust saga pattern
	const status = useUploadStatus<UploadStatusEventMask>(queriedHailpad.id); // Used to handle depth map loading when service is done processing

	const canvasRef = useRef<HTMLCanvasElement>(null);
	let depthMap: HTMLImageElement;

	const CANVAS_WIDTH = 500;
	const CANVAS_HEIGHT = 500;

	const imageExists = async (url: string) => {
		try {
			const response = await fetch(url);
			return response.ok;
		} catch {
			return false;
		}
	};

	useEffect(() => {
		(async () => {
			if ((status && status.success) || await imageExists(depthMapPath)) {
				setIsLoading(false);
				performAdaptiveThreshold();
			}
		})();
	}, [status]);

	useEffect(() => {
		if (!isLoading) {
			// loadDepthMap(); // TODO: TBD
			performAdaptiveThreshold();
		}
	}, [isLoading]);

	useEffect(() => {
		performAdaptiveThreshold();
	}, [adaptiveBlockSliderValue, adaptiveCSliderValue]);

	const loadDepthMap = () => {
		depthMap = new Image();
		depthMap.src = depthMapPath;

		depthMap.onload = () => {
			if (!canvasRef.current) return;
			const canvas = canvasRef.current;

			const context = canvas.getContext("2d");
			if (!context) return;

			context.drawImage(depthMap, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		};
	}

	const performAdaptiveThreshold = () => {
		if (!canvasRef.current) return;
		const canvas = canvasRef.current;

		const context = canvas.getContext("2d");
		if (!context) return;

		depthMap = new Image();
		depthMap.src = depthMapPath;

		depthMap.onload = () => {
			let depthMapImage = cv.imread(depthMap);
			let dst = new cv.Mat();

			cv.cvtColor(depthMapImage, depthMapImage, cv.COLOR_RGBA2GRAY, 0);
			cv.adaptiveThreshold(
				depthMapImage, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, adaptiveBlockSliderValue, adaptiveCSliderValue
			);

			cv.resize(dst, dst, new cv.Size(CANVAS_WIDTH, CANVAS_HEIGHT), 0, 0, cv.INTER_AREA);
			cv.imshow(canvas, dst);

			dst.delete();
		}
	}

	return (
		<main className="flex h-full items-center justify-center">
			<Card className="sm:min-w-[500px]">
				<CardHeader>
					<CardTitle>{queriedHailpad.name}</CardTitle>
					<CardDescription>
						Fine-tune the binary mask of the hailpad depth map.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-row gap-4">
						<div className="flex flex-col gap-4">
							{isLoading ?
								<div className="flex flex-row justify-center opacity-70 bg-gray-500 bg-opacity-5 w-[500px] h-[500px] border-[1px] border-black-900 rounded-md">
									<LoadingIndicator message={"Preparing depth map..."} />
								</div>
								:
								<canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_WIDTH} />
							}
						</div>
						<div className="flex flex-col justify-between">
							<div>
								<div className="flex flex-row gap-2 mb-4">
									<p className="text-lg font-semibold ">Adaptive Thresholding</p>
									<Popover>
										<PopoverTrigger>
											<Info size={12} />
										</PopoverTrigger>
										<PopoverContent className="w-[300px]">
											<div className="space-y-4">
												<div className="flex grid-cols-2 gap-2">
													<div className="mb-2 w-fit">
														<p className="text-lg font-semibold">About Adaptive Thresholding</p>
														<CardDescription className="flex flex-col space-y-2 text-sm">
															<span>
																TODO
															</span>
														</CardDescription>
													</div>
												</div>
											</div>
										</PopoverContent>
									</Popover>
								</div>
								<div className="mb-1 flex flex-row justify-between">
									<Label>
										Block Size
									</Label>
									<CardDescription>{adaptiveBlockSliderValue}</CardDescription>
								</div>
								<Slider
									min={3}
									max={29}
									step={2}
									value={[adaptiveBlockSliderValue]}
									onValueChange={(value: number[]) => setAdaptiveBlockSliderValue(value[0])}
								/>
								<div className="mb-1 mt-4 flex flex-row justify-between">
									<Label>
										<span className="italic">C</span>-Value
									</Label>
									<CardDescription>{adaptiveCSliderValue}</CardDescription>
								</div>
								<Slider
									min={-10}
									max={10}
									step={1}
									value={[adaptiveCSliderValue]}
									onValueChange={(value: number[]) => setAdaptiveCSliderValue(value[0])}
								/>
								<p className="text-lg font-semibold mt-8 mb-4">Global Thresholding</p>
								<p className="text-lg font-semibold mt-8 mb-4">Other Adjustments</p>
							</div>
							<div className="flex flex-row">
								{<Button
									type="submit"
								>
									Perform Analysis and Continue
								</Button>}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
