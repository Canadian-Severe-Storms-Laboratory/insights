import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { $updatePadActionById, type Pad } from '@/lib/client';
import { useNavigate } from '@tanstack/react-router';
import { parseResponse } from 'hono/client';
import { CheckIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const CANVAS_SIZE = 500;

export default function DepthViewer({
    hailpad,
    depthMap
}: {
    hailpad: Pad;
    depthMap: ImageBitmap | undefined;
}) {
    const [uploading, setUploading] = useState(false);
    const [maxDepth, setMaxDepth] = useState<number | undefined>(undefined);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!depthMap || !canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw depth map
        ctx.drawImage(depthMap, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Highlight the area of greatest depth
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#8F55E0';
        ctx.beginPath();
        ctx.arc(
            Number(hailpad.maxDepthLocationX),
            Number(hailpad.maxDepthLocationY),
            7,
            0,
            2 * Math.PI
        );
        ctx.fill();
    }, [depthMap, hailpad.maxDepthLocationX, hailpad.maxDepthLocationY]);

    const handleSubmit = async () => {
        try {
            setUploading(true);

            await parseResponse(
                $updatePadActionById({
                    param: { id: hailpad.id },
                    form: {
                        action: 'maxDepth',
                        maxDepth: String(maxDepth) || '0'
                    }
                })
            );
            
            await navigate({
                to: '/hailgen/$id',
                params: { id: hailpad.id }
            });
        } catch (error) {
            console.error('Error submitting maximum depth:', error);
            toast.error('Failed to submit maximum depth. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="w-fit mx-auto">
            <CardHeader>
                <CardTitle>{hailpad.name}</CardTitle>
                <CardDescription>
                    The following region was identified to contain the greatest depth relative to
                    the rest of the hailpad. Enter the mm measurement of this depth.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!depthMap ? (
                    <div className="border-black-900 flex h-[500px] w-[500px] flex-row justify-center rounded-md border opacity-70">
                        <Spinner /> Loading Depth Map...
                    </div>
                ) : (
                    <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
                )}
            </CardContent>
            <div className="flex flex-col gap-6">
                <CardContent>
                    <Label>Maximum Depth</Label>
                    <Input
                        type="number"
                        className="w-32 mt-2"
                        placeholder="e.g., 3.11"
                        disabled={!depthMap}
                        value={maxDepth}
                        onChange={(e) => setMaxDepth(Number(e.target.value))}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button
                        className="flex min-w-[175px] gap-2 w-fit"
                        disabled={!depthMap || uploading}
                        onClick={handleSubmit}
                    >
                        Save and Finish
                        {uploading ? (
                            <Spinner className="h-4 w-4" />
                        ) : (
                            <CheckIcon className="h-4 w-4" />
                        )}
                    </Button>
                </CardFooter>
            </div>
        </Card>
    );
}
