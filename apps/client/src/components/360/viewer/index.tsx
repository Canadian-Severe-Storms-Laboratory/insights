import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Capture } from '@/lib/client';
import { CameraControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { createXRStore, XR } from '@react-three/xr';
import CameraControlsImpl from 'camera-controls';
import {
    LucideChevronDown,
    LucideChevronsDown,
    LucideChevronsUp,
    LucideChevronUp,
    LucideExpand,
    LucideGlasses,
    LucideShrink
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { MathUtils } from 'three';
import { Compass } from './compass';
import { ErrorBoundary } from './error-boundary';
import { Loader } from './loader';
import { MovementController } from './movement-controller';
import { StreetViewImage } from './street-view-image';

export interface PathProgress {
    hasBefore: boolean;
    hasNext: boolean;
    hasPrevious: boolean;
    hasNextJump: boolean;
    hasPreviousJump: boolean;
}

export default function Viewer360({
    capture,
    captureURL,
    pathProgress,
    currentState,
    onCurrentStateChange,
    onNext,
    onJumpNext,
    onPrevious,
    onJumpPrevious,
    className
}: {
    capture: Capture;
    captureURL: string;
    pathProgress: PathProgress;
    currentState: 'before' | 'after';
    onCurrentStateChange: (value: 'before' | 'after') => void;
    onNext: () => void;
    onJumpNext: () => void;
    onPrevious: () => void;
    onJumpPrevious: () => void;
    className?: string;
}) {
    const [controls, setControls] = useState<CameraControls | null>(null);
    const fullscreenRef = useRef<HTMLDivElement>(null);
    const [hidden, setHidden] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [startingAngle, setStartingAngle] = useState(
        capture.heading ? Number(capture.heading) : 0
    );
    const xrStore = useMemo(() => createXRStore(), []);

    const toggleFullscreen = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await fullscreenRef.current?.requestFullscreen();
        }
    };

    const setCurrentImage = (value: 'before' | 'after') => {
        if (value === 'before' && !pathProgress.hasBefore) return;
        onCurrentStateChange(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        switch (e.key.toLowerCase()) {
            case 'arrowup':
                onNext?.();
                break;
            case 'arrowdown':
                onPrevious?.();
                break;
            case 'h':
                setHidden((h) => !h);
                break;
        }
    };

    useEffect(() => {
        const onFullscreenChange = () => {
            setFullscreen(document.fullscreenElement !== null);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, []);

    // Update starting angle when capture changes
    useEffect(() => {
        setStartingAngle(capture.heading ? Number(capture.heading) : 0);
    }, [capture]);

    const navButtons = [
        {
            label: 'Jump Forward',
            icon: LucideChevronsUp,
            onClick: onJumpNext,
            disabled: !pathProgress.hasNextJump
        },
        {
            label: 'Forward',
            icon: LucideChevronUp,
            onClick: onNext,
            disabled: !pathProgress.hasNext
        },
        {
            label: 'Backward',
            icon: LucideChevronDown,
            onClick: onPrevious,
            disabled: !pathProgress.hasPrevious
        },
        {
            label: 'Jump Backward',
            icon: LucideChevronsDown,
            onClick: onJumpPrevious,
            disabled: !pathProgress.hasPreviousJump
        }
    ];

    return (
        <div className={className} ref={fullscreenRef} tabIndex={0} onKeyDown={handleKeyDown}>
            {!hidden && (
                <>
                    <div className="absolute bottom-3 left-5 z-10 text-2xl">
                        <span className="font-bold">CSSL</span> 360
                    </div>

                    <div className="bg-background/60 absolute z-10 m-2 flex flex-row items-center gap-4 rounded-lg p-2 text-lg backdrop-blur">
                        <RadioGroup
                            onValueChange={(value) => setCurrentImage(value as 'before' | 'after')}
                            value={currentState}
                            defaultValue="after"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    value="before"
                                    id="before"
                                    disabled={!pathProgress.hasBefore}
                                />
                                <Label
                                    htmlFor="before"
                                    className={
                                        !pathProgress.hasBefore ? 'text-primary/50' : undefined
                                    }
                                >
                                    Before
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="after" id="after" />
                                <Label htmlFor="after">After</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <Compass controls={controls} />

                    <div className="absolute top-1/2 right-0 bottom-1/2 z-10 m-2 flex flex-col items-center justify-center gap-4">
                        {navButtons.map((btn) => (
                            <button
                                key={btn.label}
                                title={btn.label}
                                aria-label={btn.label}
                                className="bg-background/60 hover:bg-foreground/40 hover:text-background rounded-lg p-2 backdrop-blur transition hover:cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                                onClick={btn.onClick}
                                disabled={btn.disabled}
                            >
                                <btn.icon />
                            </button>
                        ))}
                    </div>

                    <div className="absolute right-0 bottom-0 z-10 m-2 flex flex-row gap-4">
                        <button
                            title="Enter VR"
                            aria-label="Enter VR"
                            onClick={() => xrStore.enterVR()}
                            className="bg-background/60 hover:bg-foreground/40 hover:text-background rounded-lg p-2 backdrop-blur transition hover:cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                        >
                            <LucideGlasses />
                        </button>
                        <button
                            title={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                            aria-label={fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                            onClick={toggleFullscreen}
                            className="bg-background/60 hover:bg-foreground/40 hover:text-background rounded-lg p-2 backdrop-blur transition hover:cursor-pointer"
                        >
                            {fullscreen ? <LucideShrink /> : <LucideExpand />}
                        </button>
                    </div>
                </>
            )}

            <Canvas className="touch-none">
                <CameraControls
                    ref={setControls}
                    makeDefault
                    minDistance={0}
                    maxDistance={0}
                    minZoom={0.5}
                    maxZoom={5}
                    dollySpeed={1}
                    azimuthRotateSpeed={-0.5}
                    polarRotateSpeed={-0.5}
                    draggingSmoothTime={0}
                    // https://github.com/yomotsu/camera-controls/blob/cee042753169f3bbeb593833ce92d70d52b6862f/src/types.ts#L29C1-L47
                    mouseButtons={{
                        left: CameraControlsImpl.ACTION.ROTATE,
                        middle: CameraControlsImpl.ACTION.NONE,
                        right: CameraControlsImpl.ACTION.NONE,
                        wheel: CameraControlsImpl.ACTION.ZOOM
                    }}
                    touches={{
                        one: CameraControlsImpl.ACTION.TOUCH_ROTATE,
                        two: CameraControlsImpl.ACTION.TOUCH_ZOOM,
                        three: CameraControlsImpl.ACTION.NONE
                    }}
                />
                <XR store={xrStore}>
                    <MovementController
                        hand="left"
                        onSqueeze={() => onJumpPrevious()} // Left Grip (Jump Backward)
                        onTrigger={() => onPrevious()} // Left Trigger (Backward)
                        onPrimaryButton={() => setCurrentImage('before')} // Y (Before)
                    />
                    <MovementController
                        hand="right"
                        onSqueeze={() => onJumpNext()} // Right Grip (Jump Forward)
                        onTrigger={() => onNext()} // Right Trigger (Forward)
                        onPrimaryButton={() => setCurrentImage('after')} // B (After)
                    />

                    <ErrorBoundary fallback={<Loader />}>
                        <Suspense fallback={<Loader />}>
                            <StreetViewImage
                                image={captureURL}
                                startingAngleRad={MathUtils.degToRad(startingAngle)}
                            />
                        </Suspense>
                    </ErrorBoundary>
                </XR>
            </Canvas>
        </div>
    );
}
