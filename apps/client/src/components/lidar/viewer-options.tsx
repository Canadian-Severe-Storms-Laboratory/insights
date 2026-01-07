import { useStore } from '@/components/lidar/viewer/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { Route } from '@/routes/_lidar/lidar/$id';
import { LucideBird, LucideCircle, LucideEarth, LucideSave, LucideSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

function OptionRow({
    children,
    type = 'column',
    className
}: {
    children?: React.ReactNode;
    type?: 'row' | 'column';
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex gap-2',
                type === 'row' ? 'flex-row items-center' : 'flex-col items-start',
                className
            )}
        >
            {children}
        </div>
    );
}

function CameraControlSelector() {
    const { cameraControl, setCameraControl } = useStore(
        useShallow((state) => ({
            cameraControl: state.cameraControl,
            setCameraControl: state.setCameraControl
        }))
    );

    return (
        <OptionRow>
            <Label htmlFor="camera-control">Camera Control</Label>
            <ToggleGroup
                type="single"
                defaultValue={cameraControl}
                onValueChange={(value) => setCameraControl(value as 'fly' | 'earth')}
                variant="outline"
            >
                <ToggleGroupItem value="fly" className="flex flex-row gap-1">
                    <LucideBird size={16} />
                    Fly
                </ToggleGroupItem>
                <ToggleGroupItem value="earth" className="flex flex-row gap-1" disabled>
                    <LucideEarth size={16} />
                    Earth
                </ToggleGroupItem>
            </ToggleGroup>
        </OptionRow>
    );
}

function PointBudgetSlider() {
    const { budget, setBudget } = useStore(
        useShallow((state) => ({
            budget: state.budget,
            setBudget: state.setBudget
        }))
    );

    return (
        <OptionRow>
            <Label htmlFor="point-budget-slider">Point Budget</Label>
            <div className="flex w-full flex-row items-center gap-2">
                <Slider
                    id="point-budget-slider"
                    min={100_000}
                    max={3_000_000}
                    step={50_000}
                    value={[budget]}
                    onValueChange={(value) => setBudget(value[0] || 100_000)}
                />
                <p className="text-sm font-normal">{budget.toLocaleString()}</p>
            </div>
        </OptionRow>
    );
}

function PointSizeSlider() {
    const { size, setSize } = useStore(
        useShallow((state) => ({
            size: state.size,
            setSize: state.setSize
        }))
    );

    return (
        <OptionRow>
            <Label htmlFor="point-size-slider">Point Size</Label>
            <div className="flex w-full flex-row items-center gap-2">
                <Slider
                    id="point-size-slider"
                    min={1}
                    max={5}
                    step={1}
                    value={[size]}
                    onValueChange={(value) => setSize(value[0] || 1)}
                />
                <p className="text-sm font-normal">{size.toFixed(0)}</p>
            </div>
        </OptionRow>
    );
}

function PointShapeSelector() {
    const { shape, setShape } = useStore(
        useShallow((state) => ({
            shape: state.shape,
            setShape: state.setShape
        }))
    );

    return (
        <OptionRow>
            <Label htmlFor="point-shape">Point Shape</Label>
            <ToggleGroup
                type="single"
                defaultValue={shape === 1 ? 'circle' : 'square'}
                onValueChange={(value) => setShape(value === 'circle' ? 1 : 0)}
                variant="outline"
            >
                <ToggleGroupItem value="square" className="flex flex-row gap-1">
                    <LucideSquare size={16} />
                    Square
                </ToggleGroupItem>
                <ToggleGroupItem value="circle" className="flex flex-row gap-1">
                    <LucideCircle size={16} />
                    Circle
                </ToggleGroupItem>
            </ToggleGroup>
        </OptionRow>
    );
}

function FPS() {
    const fps = useStore((state) => state.fps);
    const [averageFPS, setAverageFPS] = useState<number[]>([]);

    // Calculate average FPS
    useEffect(() => {
        if (averageFPS.length >= 60) {
            averageFPS.shift();
        }

        setAverageFPS((prev) => [...prev, fps]);
    }, [fps]);

    return (
        <OptionRow type="column">
            <OptionRow type="row">
                <p className="text-sm font-medium">FPS</p>
                <p className="text-sm font-normal">{fps}</p>
            </OptionRow>
            <OptionRow type="row">
                <p className="text-sm font-medium">Avg. FPS</p>
                <p className="text-sm font-normal">
                    {averageFPS.length
                        ? Math.floor(averageFPS.reduce((a, b) => a + b) / averageFPS.length)
                        : 0}
                </p>
            </OptionRow>
        </OptionRow>
    );
}

function CameraTransformDebug() {
    const { isAuthenticated } = useAuth();
    const { id } = Route.useParams();
    const { cameraPosition, cameraRotation } = useStore(
        useShallow((state) => ({
            cameraPosition: state.cameraPosition,
            cameraRotation: state.cameraRotation
        }))
    );

    return (
        <OptionRow type="column" className="gap-4">
            <p className="text-sm font-semibold">Camera Transform</p>
            <OptionRow type="row">
                <p className="text-sm font-medium">Position</p>
                <div className="flex flex-row gap-1 text-sm font-normal">
                    {cameraPosition.map((coord, i) => (
                        <p key={i} className="bg-muted rounded-lg px-2 py-1 text-sm font-medium">
                            {coord.toFixed(2)}
                        </p>
                    ))}
                </div>
            </OptionRow>
            <OptionRow type="row">
                <p className="text-sm font-medium">Rotation</p>
                <div className="flex flex-row gap-1 text-sm font-normal">
                    {cameraRotation.map((coord, i) => (
                        <p key={i} className="bg-muted rounded-lg px-2 py-1 text-sm font-medium">
                            {coord.toFixed(2)}
                        </p>
                    ))}
                </div>
            </OptionRow>
            {isAuthenticated && (
                <Button
                    variant="outline"
                    className="w-full gap-1"
                    onClick={async () => {
                        try {
                            // const response = await fetch(`/lidar/${id}`, {
                            //     method: 'POST',
                            //     headers: {
                            //         'Content-Type': 'application/json'
                            //     },
                            //     body: JSON.stringify({
                            //         type: 'setTransform',
                            //         payload: {
                            //             position: cameraPosition,
                            //             rotation: cameraRotation
                            //         }
                            //     })
                            // });

                            // if (!response.ok) {
                            //     toast.error('Failed to set default camera transform');
                            //     console.error(await response.json());
                            //     return;
                            // }

                            toast.success('Successfully set default camera transform');
                        } catch (e) {
                            toast.error('Failed to set default camera transform');
                            console.error(e);
                        }
                    }}
                >
                    <LucideSave size={16} />
                    Save Camera Transform
                </Button>
            )}
        </OptionRow>
    );
}

export function Options({ className }: { className?: string }) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Options</CardTitle>
                <CardDescription>Change the current LiDAR view.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="view" className="w-full">
                    <TabsList className="mb-4 grid w-full grid-cols-2">
                        <TabsTrigger value="view">View</TabsTrigger>
                        <TabsTrigger value="debug">Debug</TabsTrigger>
                    </TabsList>
                    <TabsContent value="view" className="grid grid-cols-1 gap-4">
                        <CameraControlSelector />
                        <PointBudgetSlider />
                        <PointSizeSlider />
                        <PointShapeSelector />
                    </TabsContent>
                    <TabsContent value="debug" className="flex flex-col gap-4">
                        <FPS />
                        <Separator />
                        <CameraTransformDebug />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
