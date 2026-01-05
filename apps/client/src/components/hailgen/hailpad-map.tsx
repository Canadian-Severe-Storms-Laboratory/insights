import { EmptyState } from '@/components/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { useDepthMap } from '@/hooks/use-depth-map';
import { usePadAll } from '@/hooks/use-hailpad-all';
import { HAILPAD_IMAGE_SIZE } from '@/lib/hailgen/helpers';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const CANVAS_SIZE = HAILPAD_IMAGE_SIZE;

export default function HailpadMap({
    padId,
    index,
    showCentroids,
    showFittedEllipses,
    onIndexChange
}: {
    padId: string;
    index: number;
    showCentroids: boolean;
    showFittedEllipses: boolean;
    onIndexChange: (index: number) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { filteredData: pad } = usePadAll(padId);
    const { data: depthMap } = useDepthMap(padId);

    useEffect(() => {
        if (!pad) return;
        if (!depthMap) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get depth map image from hailpad folder
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.drawImage(depthMap, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

        for (let i = 0; i < pad.dents.length; i++) {
            const dent = pad.dents[i];

            if (!dent) continue;

            if (i === index || showFittedEllipses) {
                ctx.globalAlpha = 1;
                ctx.beginPath();
                const x = Number(dent.centroidX);
                const y = Number(dent.centroidY);
                const defaultRadius = 20;

                if (dent.angle === null) {
                    ctx.arc(x, y, defaultRadius, 0, 2 * Math.PI);
                } else {
                    ctx.ellipse(
                        x,
                        y,
                        Number(dent.majorAxis),
                        Number(dent.minorAxis),
                        Number(dent.angle) + Math.PI / 2,
                        0,
                        2 * Math.PI
                    );
                }

                ctx.strokeStyle = i === index ? '#8F55E0' : '#8F55E0';
                ctx.lineWidth = 3;
                ctx.setLineDash([7, 5]);
                ctx.stroke();
            }

            // Render all dent centroids
            if (showCentroids && ctx) {
                const x = Number(dent.centroidX);
                const y = Number(dent.centroidY);
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        const handleClick = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Set index based on if a centroid was clicked within a certain radius
            const clickRadius = 25;
            for (let i = 0; i < pad.dents.length; i++) {
                const [centroidX, centroidY] = [
                    Number(pad.dents[i]?.centroidX),
                    Number(pad.dents[i]?.centroidY)
                ];
                const distance = Math.sqrt(Math.pow(x - centroidX, 2) + Math.pow(y - centroidY, 2));
                if (distance <= clickRadius) {
                    onIndexChange(i);
                    break;
                }
            }
        };

        const handleDoubleClick = async (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Copy x and y to clipboard
            try {
                await navigator.clipboard.writeText(`(${x}, ${y})`);
            } catch (error) {
                console.error('Failed to write to clipboard: ' + error);
            }
            // Show toast notification
            toast('Coordinates copied to clipboard', {
                description: `(${x}, ${y})`
            });
        };

        // Event handler for clicking near a centroid to change index
        canvas.addEventListener('click', handleClick);

        // Event handler for double-clicking on the depth map to copy x and y coordinates to clipboard
        canvas.addEventListener('dblclick', handleDoubleClick);

        return () => {
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [depthMap, pad, index, showCentroids, showFittedEllipses, onIndexChange]);

    if (!depthMap) {
        return (
            <EmptyState
                icon={<Spinner />}
                title="Loading..."
                description="The depth map is being loaded. Please wait."
            />
        );
    }

    return <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />;
}
