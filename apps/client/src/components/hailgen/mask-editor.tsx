import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import { client, createAxiosPostFormHandler, type Pad } from '@/lib/client';
import { useNavigate } from '@tanstack/react-router';
import cv from '@techstark/opencv-js';
import { InfoIcon, RefreshCcw, ScanLineIcon } from 'lucide-react';
import { useEffect, useReducer, useRef, useState } from 'react';
import { toast } from 'sonner';

const CANVAS_SIZE = 500;

interface MaskEditorState {
    adaptiveBlockSize: number;
    adaptiveCValue: number;
    isCLAHE: boolean;
    clipLimit: number;
    tileGridSize: number;
    minArea: number;
    maxArea: number;
    globalThreshold: number;
    isErodeDilate: boolean;
    isRemoveEdges: boolean;
}

type MaskEditorAction =
    | { type: 'SET_ADAPTIVE_BLOCK_SIZE'; payload: number }
    | { type: 'SET_ADAPTIVE_C_VALUE'; payload: number }
    | { type: 'TOGGLE_CLAHE' }
    | { type: 'SET_CLIP_LIMIT'; payload: number }
    | { type: 'SET_TILE_GRID_SIZE'; payload: number }
    | { type: 'SET_MIN_AREA'; payload: number }
    | { type: 'SET_MAX_AREA'; payload: number }
    | { type: 'SET_GLOBAL_THRESHOLD'; payload: number }
    | { type: 'TOGGLE_ERODE_DILATE' }
    | { type: 'TOGGLE_REMOVE_EDGES' };

const INITIAL_STATE: MaskEditorState = {
    adaptiveBlockSize: 11,
    adaptiveCValue: 2,
    isCLAHE: false,
    clipLimit: 2,
    tileGridSize: 8,
    minArea: 100,
    maxArea: 10000,
    globalThreshold: 127,
    isErodeDilate: false,
    isRemoveEdges: false
};

function maskEditorReducer(state: MaskEditorState, action: MaskEditorAction): MaskEditorState {
    switch (action.type) {
        case 'SET_ADAPTIVE_BLOCK_SIZE':
            return { ...state, adaptiveBlockSize: action.payload };
        case 'SET_ADAPTIVE_C_VALUE':
            return { ...state, adaptiveCValue: action.payload };
        case 'TOGGLE_CLAHE':
            return { ...state, isCLAHE: !state.isCLAHE };
        case 'SET_CLIP_LIMIT':
            return { ...state, clipLimit: action.payload };
        case 'SET_TILE_GRID_SIZE':
            return { ...state, tileGridSize: action.payload };
        case 'SET_MIN_AREA':
            return { ...state, minArea: action.payload };
        case 'SET_MAX_AREA':
            return { ...state, maxArea: action.payload };
        case 'SET_GLOBAL_THRESHOLD':
            return { ...state, globalThreshold: action.payload };
        case 'TOGGLE_ERODE_DILATE':
            return { ...state, isErodeDilate: !state.isErodeDilate };
        case 'TOGGLE_REMOVE_EDGES':
            return { ...state, isRemoveEdges: !state.isRemoveEdges };
        default:
            return state;
    }
}

function performThresholding(src: cv.Mat, dst: cv.Mat, mask: cv.Mat, state: MaskEditorState) {
    // Convert to Grayscale
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

    // Global Threshold
    cv.threshold(src, mask, state.globalThreshold, 255, cv.THRESH_BINARY);
    cv.bitwise_and(mask, src, dst);

    // CLAHE
    if (state.isCLAHE) {
        let clahe = new cv.CLAHE(
            state.clipLimit,
            new cv.Size(state.tileGridSize, state.tileGridSize)
        );
        clahe.apply(dst, dst);
        clahe.delete();
    }

    // Adaptive Threshold
    cv.adaptiveThreshold(
        dst,
        dst,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY_INV,
        state.adaptiveBlockSize,
        state.adaptiveCValue
    );

    // Erode / Dilate
    if (state.isErodeDilate) {
        let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(4, 4));
        cv.erode(dst, dst, kernel, { x: -1, y: -1 }, 1);
        cv.dilate(dst, dst, kernel, { x: -1, y: -1 }, 1);
        kernel.delete();
    }

    // Contour Filtering (Area)
    if ((state.minArea > 0 || state.maxArea > 0) && state.maxArea > state.minArea) {
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

        for (let i = 0; i < contours.size(); ++i) {
            let cnt = contours.get(i);
            let area = cv.contourArea(cnt, false);
            if (area < state.minArea || area > state.maxArea) {
                cv.drawContours(dst, contours, i, new cv.Scalar(0, 0, 0, 0), -1);
            }
            cnt.delete();
        }
        contours.delete();
        hierarchy.delete();
    }

    // Remove Edges (Experimental)
    if (state.isRemoveEdges) {
        let edges = new cv.Mat();
        cv.Canny(dst, edges, 50, 150);
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();

        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let largest = 0;
        // Find largest
        for (let i = 0; i < contours.size(); i++) {
            let area = cv.contourArea(contours.get(i), false);
            if (area > largest) largest = area;
        }
        // Remove largest
        for (let i = 0; i < contours.size(); i++) {
            let area = cv.contourArea(contours.get(i), false);
            if (area === largest) {
                cv.drawContours(dst, contours, i, new cv.Scalar(0, 0, 0, 0), -1);
            }
        }
        edges.delete();
        contours.delete();
        hierarchy.delete();
    }
}

function uploadMask(maskDataURL: string, hailpadId: string) {
    const imageDataParts = maskDataURL.split(',');
    if (imageDataParts.length < 2) {
        throw new Error('Invalid data URL format');
    }

    const byteString = atob(imageDataParts[1]!);
    const mimeString = imageDataParts[0]!.split(':')[1]!.split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });

    // Create FormData
    const formData = new FormData();
    formData.append('mask', blob, 'mask.png');

    return createAxiosPostFormHandler(client.api.hailgen.pads[':id']['mask'], {
        param: { id: hailpadId },
        formData
    });
}

export default function MaskEditor({
    hailpad,
    depthMap
}: {
    hailpad: Pad;
    depthMap: ImageBitmap | undefined;
}) {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [uploading, setUploading] = useState(false);
    const [state, dispatch] = useReducer(maskEditorReducer, INITIAL_STATE);

    useEffect(() => {
        if (!depthMap || !canvasRef.current) return;

        const timerId = setTimeout(() => {
            const canvas = canvasRef.current;

            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            ctx.drawImage(depthMap, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

            try {
                const src = cv.imread(canvas);
                const dst = new cv.Mat();
                const mask = new cv.Mat();

                // PROCESSING: Apply thresholding and other operations
                performThresholding(src, dst, mask, state);
                cv.imshow(canvas, dst);

                src.delete();
                dst.delete();
                mask.delete();
            } catch (e) {
                console.error('OpenCV Processing Error:', e);
            }
        }, 50); // 50ms delay

        // Cleanup the timer if state changes quickly
        return () => clearTimeout(timerId);
    }, [depthMap, state]);

    const handleSubmit = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Get the processed mask data
        const maskDataURL = canvas.toDataURL();

        try {
            setUploading(true);

            const response = await uploadMask(maskDataURL, hailpad.id);
            if (response.status !== 200) {
                throw new Error('Failed to upload mask');
            }
            await navigate({
                to: '/hailgen/new/$id/depth',
                params: { id: hailpad.id }
            });
        } catch (error) {
            console.error('Error uploading depth map:', error);
            toast.error('Failed to upload depth map. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="sm:min-w-[500px]">
            <CardHeader>
                <CardTitle>{hailpad.name}</CardTitle>
                <CardDescription>
                    Fine-tune the binary mask of the hailpad depth map.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-row gap-4">
                    <div className="relative flex flex-col gap-4">
                        {!depthMap ? (
                            <div className="border-black-900 flex h-[500px] w-[500px] flex-row justify-center rounded-md border opacity-70">
                                <Spinner /> Loading Depth Map...
                            </div>
                        ) : (
                            <>
                                <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
                                <Button
                                    className="absolute top-0 left-0 m-2"
                                    size="icon-sm"
                                    variant="ghost"
                                    onClick={async () => {
                                        await navigate({
                                            to: '/hailgen/new/$id/upload',
                                            params: { id: hailpad.id }
                                        });
                                    }}
                                >
                                    <RefreshCcw />
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="flex flex-col justify-between">
                        <div className="border-black-900 h-[444px] overflow-y-scroll rounded-md border p-4 pr-8">
                            <div className="mb-4 flex flex-row gap-2">
                                <p className="text-lg font-semibold">Adaptive Thresholding</p>
                                <Popover>
                                    <PopoverTrigger>
                                        <InfoIcon size={12} />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px]">
                                        <div className="space-y-4">
                                            <div className="flex grid-cols-2 gap-2">
                                                <div className="mb-2 w-fit">
                                                    <p className="text-lg font-semibold">
                                                        About Adaptive Thresholding
                                                    </p>
                                                    <CardDescription className="flex flex-col space-y-2 text-sm">
                                                        <span>
                                                            Adaptive thresholding dynamically
                                                            determines the threshold for each pixel
                                                            based on local neighborhood properties,
                                                            allowing for better segmentation in
                                                            varying lighting conditions.
                                                        </span>
                                                        <span>
                                                            <span className="font-bold">
                                                                Block size
                                                            </span>{' '}
                                                            defines the region around each pixel
                                                            used to calculate the threshold.
                                                        </span>
                                                        <span>
                                                            <span className="font-bold">
                                                                <span className="italic">C</span>
                                                                -value
                                                            </span>{' '}
                                                            is a constant subtracted from the mean
                                                            or weighted sum to fine-tune
                                                            sensitivity.
                                                        </span>
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="mb-1 flex flex-row justify-between">
                                <Label>Block Size</Label>
                                <CardDescription>{state.adaptiveBlockSize}</CardDescription>
                            </div>
                            <Slider
                                min={3}
                                max={29}
                                step={2}
                                value={[state.adaptiveBlockSize]}
                                onValueChange={(value: number[]) =>
                                    dispatch({
                                        type: 'SET_ADAPTIVE_BLOCK_SIZE',
                                        payload: value[0] || 11
                                    })
                                }
                            />
                            <div className="mt-4 mb-1 flex flex-row justify-between">
                                <Label>
                                    <span className="italic">C</span>-Value
                                </Label>
                                <CardDescription>{state.adaptiveCValue}</CardDescription>
                            </div>
                            <Slider
                                min={-10}
                                max={10}
                                step={1}
                                value={[state.adaptiveCValue]}
                                onValueChange={(value: number[]) =>
                                    dispatch({
                                        type: 'SET_ADAPTIVE_C_VALUE',
                                        payload: value[0] || 0
                                    })
                                }
                            />
                            <p className="mt-8 mb-4 text-lg font-semibold">
                                Local Contrast Enhancement
                            </p>
                            <div className="mt-2 flex flex-row items-center space-x-2">
                                <Checkbox
                                    id="clahe"
                                    checked={state.isCLAHE}
                                    onClick={() => dispatch({ type: 'TOGGLE_CLAHE' })}
                                />
                                <Label
                                    htmlFor="clahe"
                                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Enable CLAHE
                                </Label>
                                <Popover>
                                    <PopoverTrigger>
                                        <InfoIcon size={12} />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px]">
                                        <div className="space-y-4">
                                            <div className="flex grid-cols-2 gap-2">
                                                <div className="mb-2 w-fit">
                                                    <p className="text-lg font-semibold">
                                                        About CLAHE
                                                    </p>
                                                    <CardDescription className="flex flex-col space-y-2 text-sm">
                                                        Contrast Limited Adaptive Histogram
                                                        Equalization (CLAHE) enhances local contrast
                                                        in images by applying histogram equalization
                                                        to local regions (tiles) while limiting
                                                        noise amplification. This technique is
                                                        particularly useful for improving the
                                                        visibility of features in images with
                                                        varying lighting conditions.
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div
                                className={`${!state.isCLAHE ? 'opacity-40' : ''} mt-4 mb-1 flex flex-row justify-between`}
                            >
                                <Label>Clip Limit</Label>
                                <CardDescription>{state.clipLimit}</CardDescription>
                            </div>
                            <Slider
                                min={1}
                                max={10}
                                step={1}
                                value={[state.clipLimit]}
                                onValueChange={(value: number[]) =>
                                    dispatch({ type: 'SET_CLIP_LIMIT', payload: value[0] || 1 })
                                }
                                disabled={!state.isCLAHE}
                                className={`${!state.isCLAHE ? 'opacity-40' : ''}`}
                            />
                            <div
                                className={`${!state.isCLAHE ? 'opacity-40' : ''} mt-4 mb-1 flex flex-row justify-between`}
                            >
                                <Label>Tile Grid Size</Label>
                                <CardDescription>
                                    {state.tileGridSize}x{state.tileGridSize}
                                </CardDescription>
                            </div>
                            <Slider
                                min={1}
                                max={10}
                                step={1}
                                value={[state.tileGridSize]}
                                onValueChange={(value: number[]) =>
                                    dispatch({ type: 'SET_TILE_GRID_SIZE', payload: value[0] || 1 })
                                }
                                disabled={!state.isCLAHE}
                                className={`${!state.isCLAHE ? 'opacity-40' : ''}`}
                            />
                            <p className="mt-8 mb-4 text-lg font-semibold">Other Adjustments</p>
                            <div className="flex flex-row items-center justify-between">
                                <div>
                                    <Input
                                        className="h-8 w-20"
                                        type="number"
                                        value={state.minArea}
                                        step={1}
                                        min={0}
                                        onChange={(e) =>
                                            dispatch({
                                                type: 'SET_MIN_AREA',
                                                payload: Number(e.target.value)
                                            })
                                        }
                                    />
                                </div>
                                <Label>≤</Label>
                                <Label>Area</Label>
                                <Label>≤</Label>
                                <Input
                                    className="h-8 w-20"
                                    type="number"
                                    value={state.maxArea}
                                    step={1}
                                    min={0}
                                    onChange={(e) =>
                                        dispatch({
                                            type: 'SET_MAX_AREA',
                                            payload: Number(e.target.value)
                                        })
                                    }
                                />
                            </div>
                            <div className="mt-4 mb-1 flex flex-row justify-between">
                                <Label>Global Threshold Value</Label>
                                <CardDescription>{state.globalThreshold}</CardDescription>
                            </div>
                            <Slider
                                min={0}
                                max={255}
                                step={1}
                                value={[state.globalThreshold]}
                                onValueChange={(value: number[]) =>
                                    dispatch({
                                        type: 'SET_GLOBAL_THRESHOLD',
                                        payload: value[0] || 0
                                    })
                                }
                            />
                            <div className="mt-6 flex flex-row items-center space-x-2">
                                <Checkbox
                                    id="erode-dilate"
                                    checked={state.isErodeDilate}
                                    onClick={() => dispatch({ type: 'TOGGLE_ERODE_DILATE' })}
                                />
                                <Label
                                    htmlFor="erode-dilate"
                                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Erode and Dilate
                                </Label>
                            </div>
                            <div className="mt-2 flex flex-row items-center space-x-2">
                                <Checkbox
                                    id="remove-edge"
                                    checked={state.isRemoveEdges}
                                    onClick={() => dispatch({ type: 'TOGGLE_REMOVE_EDGES' })}
                                    disabled={true}
                                />
                                <Label
                                    htmlFor="remove-edge"
                                    className="text-sm leading-none font-medium opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Remove Edges (Experimental)
                                </Label>
                            </div>
                        </div>
                        <div className="flex w-full flex-row">
                            <Button
                                type="button"
                                className="flex w-full flex-row justify-between"
                                disabled={!depthMap || uploading}
                                onClick={handleSubmit}
                            >
                                Perform Analysis and Continue
                                {uploading ? (
                                    <Spinner className="h-4 w-4" />
                                ) : (
                                    <ScanLineIcon className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
