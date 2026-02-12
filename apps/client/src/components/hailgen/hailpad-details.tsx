import { padAllQueryKey, usePadAll } from '@/hooks/use-hailpad-all';
import { $updatePadActionById, type Pad } from '@/lib/client';
import { useAuth } from '@/providers/auth-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parseResponse } from 'hono/client';
import {
    CornerDownLeftIcon,
    FileSpreadsheetIcon,
    FilterIcon,
    FilterXIcon,
    SettingsIcon
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import Histogram from './histogram';

type Toggle = {
    value: boolean;
    onChange: (value: boolean) => void;
};

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p>{value}</p>
        </div>
    );
}

function DetailSection({ min, max, avg }: { min?: number; max?: number; avg?: number }) {
    const minStr: string | null = min ? min.toFixed(2).toString() : null;
    const maxStr: string | null = max ? max.toFixed(2).toString() : null;
    const avgStr: string | null = avg ? avg.toFixed(2).toString() : null;

    return (
        <div className="m-4 grid grid-cols-3 gap-4">
            {minStr && <Detail label="Minimum" value={`${minStr} mm`} />}
            {maxStr && <Detail label="Maximum" value={`${maxStr} mm`} />}
            {avgStr && <Detail label="Average" value={`${avgStr} mm`} />}
        </div>
    );
}

export default function HailpadDetails({
    padId,
    centroids,
    fittedEllipses,
    downloadLoading,
    handleDownload
}: {
    padId: string;
    centroids: Toggle;
    fittedEllipses: Toggle;
    downloadLoading: boolean;
    handleDownload: (includeFiltered: boolean) => void;
}) {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const { filteredData: pad, isLoading, error, filter, setFilter } = usePadAll(padId);
    const { minMinor, maxMinor, minMajor, maxMajor, avgMinor, avgMajor, depth } = useMemo(() => {
        if (!pad || pad.dents.length === 0) {
            return {
                minMinor: 0,
                maxMinor: 0,
                minMajor: 0,
                maxMajor: 0,
                avgMinor: 0,
                avgMajor: 0,
                depth: 0
            };
        }

        return {
            minMinor: Math.min(...(pad.dents.map((d) => Number(d.minorAxis)) || [0])),
            maxMinor: Math.max(...(pad.dents.map((d) => Number(d.minorAxis)) || [0])),
            minMajor: Math.min(...(pad.dents.map((d) => Number(d.majorAxis)) || [0])),
            maxMajor: Math.max(...(pad.dents.map((d) => Number(d.majorAxis)) || [0])),
            avgMinor: pad.dents.length
                ? pad.dents.reduce((sum, d) => sum + Number(d.minorAxis), 0) / pad.dents.length
                : 0,
            avgMajor: pad.dents.length
                ? pad.dents.reduce((sum, d) => sum + Number(d.majorAxis), 0) / pad.dents.length
                : 0,
            depth:
                pad.dents.reduce((acc, dent) => acc + Number(dent.maxDepth), 0) ||
                0 / (pad.dents.length || 1)
        };
    }, [pad]);

    const [boxfit, setBoxfit] = useState<number>(pad ? Number(pad.boxfit) : 0);
    const [maxDepth, setMaxDepth] = useState<number>(pad ? Number(pad.maxDepth) : 0);

    useEffect(() => {
        if (pad) {
            setBoxfit(Number(pad.boxfit));
            setMaxDepth(Number(pad.maxDepth));
        }
    }, [pad]);

    const mutatePadBoxfit = useMutation({
        mutationFn: (pad: Pad) => {
            return parseResponse(
                $updatePadActionById({
                    param: {
                        id: pad.id
                    },
                    form: {
                        action: 'boxfit',
                        boxfit: String(boxfit)
                    }
                })
            );
        },
        onSuccess: async () => {
            toast.success('Boxfit updated successfully.');
            queryClient.setQueryData(padAllQueryKey(pad?.id || ''), (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    boxfit: boxfit
                };
            });
        },
        onError: (error) => {
            console.error('Error updating boxfit:', error);
            toast.error('Failed to update boxfit. Please try again.');
        }
    });

    const mutatePadMaxDepth = useMutation({
        mutationFn: (pad: Pad) => {
            return parseResponse(
                $updatePadActionById({
                    param: {
                        id: pad.id
                    },
                    form: {
                        action: 'maxDepth',
                        maxDepth: String(maxDepth)
                    }
                })
            );
        },
        onSuccess: async () => {
            toast.success('Maximum depth updated successfully.');
            queryClient.setQueryData(padAllQueryKey(pad?.id || ''), (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    maxDepth: maxDepth
                };
            });
        },
        onError: (error) => {
            console.error('Error updating maximum depth:', error);
            toast.error('Failed to update maximum depth. Please try again.');
        }
    });

    const handleResetFilter = () => {
        setFilter({
            minMinor: 0,
            maxMinor: Infinity,
            minMajor: 0,
            maxMajor: Infinity
        });
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error || !pad) {
        return <div>Error loading hailpad details.</div>;
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex flex-row justify-between">
                    <div>
                        <CardTitle className="mb-2">Hailpad Details</CardTitle>
                        <CardDescription>About the current hailpad view.</CardDescription>
                    </div>
                    {isAuthenticated && (
                        <div className="justify-end">
                            <Popover>
                                <PopoverTrigger>
                                    <Button asChild variant="outline" className="h-8 w-8 p-2">
                                        <SettingsIcon />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="space-y-4">
                                        <div className="mb-6">
                                            <p className="text-lg font-semibold">View</p>
                                            <CardDescription className="text-sm">
                                                Adjust depth map overlays and calibration values.
                                            </CardDescription>
                                        </div>
                                        <div className="flex flex-row items-center space-x-2">
                                            <Checkbox
                                                id="show-centroids"
                                                checked={centroids.value}
                                                onClick={() => centroids.onChange(!centroids.value)}
                                            />
                                            <Label
                                                htmlFor="show-centroids"
                                                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                Show centroids
                                            </Label>
                                        </div>
                                        <div className="flex flex-row items-center space-x-2">
                                            <Checkbox
                                                id="show-fitted-ellipses"
                                                checked={fittedEllipses.value}
                                                onClick={() =>
                                                    fittedEllipses.onChange(!fittedEllipses.value)
                                                }
                                            />
                                            <Label
                                                htmlFor="show-fitted-ellipses"
                                                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                Show fitted ellipses
                                            </Label>
                                        </div>
                                        <div className="mt-1 flex flex-row items-center">
                                            <div className="mr-4 w-48">
                                                <Label>Box-fitting Length (mm)</Label>
                                            </div>
                                            <Input
                                                className="mr-4 h-8 w-20"
                                                type="number"
                                                value={boxfit}
                                                min={0}
                                                onChange={(e) => setBoxfit(Number(e.target.value))}
                                                step="any"
                                            />
                                            <Button
                                                type="submit"
                                                variant="secondary"
                                                className="h-8 w-8 p-2"
                                                onClick={() => mutatePadBoxfit.mutate(pad)}
                                            >
                                                <CornerDownLeftIcon />
                                            </Button>
                                        </div>
                                        <div className="mt-1 flex flex-row items-center">
                                            <div className="mr-4 w-48">
                                                <Label>Maximum Depth (mm)</Label>
                                            </div>
                                            <Input
                                                className="mr-4 h-8 w-20"
                                                type="number"
                                                value={maxDepth}
                                                min={0}
                                                onChange={(e) =>
                                                    setMaxDepth(Number(e.target.value))
                                                }
                                                step="any"
                                            />
                                            <Button
                                                type="submit"
                                                variant="secondary"
                                                className="h-8 w-8 p-2"
                                                onClick={() => mutatePadMaxDepth.mutate(pad)}
                                            >
                                                <CornerDownLeftIcon />
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
                <Tabs defaultValue="minor" className="flex flex-col h-full">
                    <div className="flex flex-row items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="minor">Minor Axis</TabsTrigger>
                            <TabsTrigger value="major">Major Axis</TabsTrigger>
                        </TabsList>
                        <div className="flex flex-row space-x-2">
                            <Button
                                disabled={downloadLoading}
                                variant="secondary"
                                className="h-8 w-8 p-2 hover:text-green-500"
                                onClick={() => handleDownload(true)}
                            >
                                <FileSpreadsheetIcon />
                            </Button>
                            <Popover>
                                <PopoverTrigger>
                                    <Button asChild variant="outline" className="h-8 w-8 p-2">
                                        <FilterIcon />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-96">
                                    <div className="space-y-4">
                                        <div className="mb-6">
                                            <p className="text-lg font-semibold">Filter</p>
                                            <CardDescription className="text-sm">
                                                Refine hailpad dent data by size.
                                            </CardDescription>
                                        </div>
                                        <div className="mt-1 flex flex-row items-center justify-between text-sm">
                                            <Input
                                                className="h-8 w-20"
                                                type="number"
                                                value={filter.minMinor === 0 ? '' : filter.minMinor}
                                                onChange={(e) =>
                                                    setFilter((prev) => {
                                                        const newValue = e.target.value
                                                            ? Number(e.target.value)
                                                            : 0;

                                                        return {
                                                            ...prev,
                                                            minMinor:
                                                                newValue > prev.maxMinor
                                                                    ? prev.maxMinor
                                                                    : newValue
                                                        };
                                                    })
                                                }
                                                min={0}
                                                placeholder="Min."
                                                step="any"
                                            />
                                            <p>≤</p>
                                            <p>Minor Axis (mm)</p>
                                            <p>≤</p>
                                            <Input
                                                className="h-8 w-20"
                                                type="number"
                                                value={
                                                    filter.maxMinor === Infinity
                                                        ? ''
                                                        : filter.maxMinor
                                                }
                                                onChange={(e) =>
                                                    setFilter((prev) => {
                                                        const newValue = e.target.value
                                                            ? Number(e.target.value)
                                                            : Infinity;

                                                        return {
                                                            ...prev,
                                                            maxMinor:
                                                                newValue < prev.minMinor
                                                                    ? prev.minMinor
                                                                    : newValue
                                                        };
                                                    })
                                                }
                                                min={0}
                                                placeholder="Max."
                                                step="any"
                                            />
                                        </div>
                                        <div className="mt-2 flex flex-row items-center justify-between text-sm">
                                            <Input
                                                className="h-8 w-20"
                                                type="number"
                                                value={filter.minMajor === 0 ? '' : filter.minMajor}
                                                onChange={(e) =>
                                                    setFilter((prev) => {
                                                        const newValue = e.target.value
                                                            ? Number(e.target.value)
                                                            : 0;

                                                        return {
                                                            ...prev,
                                                            minMajor:
                                                                newValue > prev.maxMajor
                                                                    ? prev.maxMajor
                                                                    : newValue
                                                        };
                                                    })
                                                }
                                                min={0}
                                                placeholder="Min."
                                                step="any"
                                            />
                                            <p>≤</p>
                                            <p>Major Axis (mm)</p>
                                            <p>≤</p>
                                            <Input
                                                className="h-8 w-20"
                                                type="number"
                                                value={
                                                    filter.maxMajor === Infinity
                                                        ? ''
                                                        : filter.maxMajor
                                                }
                                                onChange={(e) =>
                                                    setFilter((prev) => {
                                                        const newValue = e.target.value
                                                            ? Number(e.target.value)
                                                            : Infinity;

                                                        return {
                                                            ...prev,
                                                            maxMajor:
                                                                newValue < prev.minMajor
                                                                    ? prev.minMajor
                                                                    : newValue
                                                        };
                                                    })
                                                }
                                                min={0}
                                                placeholder="Max."
                                                step="any"
                                            />
                                        </div>
                                        <div className="mt-6 flex flex-row justify-between">
                                            <Button
                                                type="reset"
                                                variant="secondary"
                                                className="h-8 w-8 p-2"
                                                onClick={handleResetFilter}
                                            >
                                                <FilterXIcon />
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <TabsContent value="minor">
                        <DetailSection min={minMinor} max={maxMinor} avg={avgMinor} />
                        <Histogram data={pad.dents.map((dent) => Number(dent.minorAxis))} />
                    </TabsContent>
                    <TabsContent value="major">
                        <DetailSection min={minMajor} max={maxMajor} avg={avgMajor} />
                        <Histogram data={pad.dents.map((dent) => Number(dent.majorAxis))} />
                    </TabsContent>
                    <TabsContent value="depth">
                        <DetailSection avg={depth} />
                        {/* <Histogram data={pad.dents.map((dent) => Number(dent.maxDepth))} /> */}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
