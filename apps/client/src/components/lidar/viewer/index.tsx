import { cn } from '@/lib/utils';
import { Canvas } from '@react-three/fiber';
import { createXRStore, XR } from '@react-three/xr';
import { LucideExpand, LucideGlasses, LucideShrink } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DebugTools } from './debug-tools';
import { Renderer } from './renderer';
import type { ViewerSettings } from './schema';
import { useStore } from './store';

export default function PointCloudViewer({
    url,
    className,
    initialTransform,
    debug
}: {
    url: string;
    className?: string;
    initialTransform: ViewerSettings;
    debug?: boolean;
}) {
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const xrStore = useMemo(() => createXRStore(), []);
    const setInitialTransform = useStore((state) => state.setInitialTransform);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Set initial transform
    useEffect(() => {
        if (initialTransform) {
            setInitialTransform(
                [
                    initialTransform.position[0],
                    initialTransform.position[1],
                    initialTransform.position[2]
                ],
                [
                    initialTransform.rotation[0],
                    initialTransform.rotation[1],
                    initialTransform.rotation[2]
                ]
            );
        }
    }, [initialTransform, setInitialTransform]);

    return (
        <div
            className={cn('bg-card relative h-full w-full rounded-lg border shadow-sm', className)}
            ref={fullscreenRef}
        >
            <p className="absolute bottom-3 left-5 z-10 text-2xl">
                <span className="font-bold">CSSL</span> LiDAR
            </p>
            <div className="absolute right-0 bottom-0 z-10 m-2 flex flex-row gap-4">
                <button
                    onClick={() => {
                        xrStore.enterVR();
                    }}
                    className="bg-background/60 hover:bg-foreground/40 hover:text-background rounded-lg p-2 backdrop-blur transition hover:cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                >
                    <LucideGlasses />
                </button>
                <button
                    onClick={() => {
                        void (async () => {
                            if (fullscreen) await document.exitFullscreen();
                            else await fullscreenRef.current?.requestFullscreen();
                        })();
                    }}
                    className="bg-background/60 hover:bg-foreground/40 hover:text-background rounded-lg p-2 backdrop-blur transition hover:cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                >
                    {fullscreen ? <LucideShrink /> : <LucideExpand />}
                </button>
            </div>
            <Canvas id="potree-canvas">
                <XR store={xrStore}>
                    <Renderer pointCloudURL={url} />
                    {debug && <DebugTools />}
                </XR>
            </Canvas>
        </div>
    );
}
