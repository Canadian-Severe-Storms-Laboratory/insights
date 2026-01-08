import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { padAllQueryKey, usePadAll, type PadAll } from '@/hooks/use-hailpad-all';
import { $updatePadActionById } from '@/lib/client';
import { useAuth } from '@/providers/auth-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parseResponse } from 'hono/client';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CornerDownLeftIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Spinner } from '../ui/spinner';

function Detail({ label, value }: { label: string; value?: string }) {
    return (
        <div className="flex flex-col">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p>{value}</p>
        </div>
    );
}

export default function DentDetails({
    padId,
    index,
    onPrevious,
    onNext,
    onIndexChange
}: {
    padId: string;
    index: number;
    onPrevious?: () => void;
    onNext?: () => void;
    onIndexChange?: (newIndex: number) => void;
}) {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const { filteredData: pad, isLoading, error } = usePadAll(padId);

    const dents = pad?.dents || [];
    const currentID = dents[index] ? dents[index].id : null;

    const [dentAxis, setDentAxis] = useState<{ minor: number; major: number }>({
        minor: dents[index] ? Number(dents[index].minorAxis) : 0,
        major: dents[index] ? Number(dents[index].majorAxis) : 0
    });

    const [deleteDentPopupOpen, setDeleteDentPopupOpen] = useState(false);

    const [newDent, setNewDent] = useState<{
        minor: number;
        major: number;
        maxDepth: number;
        centroidX: number;
        centroidY: number;
    }>({
        minor: 0,
        major: 0,
        maxDepth: 0,
        centroidX: 0,
        centroidY: 0
    });

    const handleDeleteDent = useMutation({
        mutationFn: () => {
            const dentId = dents[index]?.id;

            if (!dentId) {
                throw new Error('No dent selected for deletion.');
            }

            return parseResponse(
                $updatePadActionById({
                    param: { id: padId },
                    form: {
                        action: 'deleteDent',
                        dentId: dentId
                    }
                })
            );
        },
        onMutate: () => {
            setDeleteDentPopupOpen(false);
        },
        onSuccess: async () => {
            toast.success('Dent deleted successfully.');
            onIndexChange?.(index > 0 ? index - 1 : 0);

            queryClient.setQueryData(padAllQueryKey(padId), (oldData: PadAll | undefined) => {
                if (!oldData) return oldData;

                const updatedDents = oldData.dents.filter((_, i) => i !== index);

                return {
                    ...oldData,
                    dents: updatedDents
                };
            });
        },
        onError: (error) => {
            console.error('Error deleting dent:', error);
            toast.error('Failed to delete dent. Please try again.');
        }
    });

    const handleModifyDentAxis = useMutation({
        mutationFn: () => {
            return parseResponse(
                $updatePadActionById({
                    param: { id: padId },
                    form: {
                        action: 'dentAxis',
                        dentId: currentID || '',
                        minorAxis: String(dentAxis.minor),
                        majorAxis: String(dentAxis.major)
                    }
                })
            );
        },
        onSuccess: async () => {
            toast.success('Dent updated successfully.');
            setDentAxis({ minor: 0, major: 0 });

            queryClient.setQueryData(padAllQueryKey(padId), (oldData: PadAll | undefined) => {
                if (!oldData) return oldData;

                const updatedDents = oldData.dents.map((dent, i) => {
                    if (i === index) {
                        return {
                            ...dent,
                            minorAxis: String(dentAxis.minor),
                            majorAxis: String(dentAxis.major)
                        };
                    }
                    return dent;
                });

                return {
                    ...oldData,
                    dents: updatedDents
                };
            });
        },
        onError: (error) => {
            console.error('Error updating dent:', error);
            toast.error('Failed to update dent. Please try again.');
        }
    });

    const handleCreateDent = useMutation({
        mutationFn: () => {
            return parseResponse(
                $updatePadActionById({
                    param: { id: padId },
                    form: {
                        action: 'newDent',
                        minorAxis: String(newDent.minor),
                        majorAxis: String(newDent.major),
                        maxDepth: String(newDent.maxDepth),
                        centroidX: String(newDent.centroidX),
                        centroidY: String(newDent.centroidY)
                    }
                })
            );
        },
        onSuccess: async (data) => {
            toast.success('Dent created successfully.');
            setNewDent({
                minor: 0,
                major: 0,
                maxDepth: 0,
                centroidX: 0,
                centroidY: 0
            });

            if (!('dent' in data)) return;
            const createdDent = data.dent;

            queryClient.setQueryData(padAllQueryKey(padId), (oldData: PadAll | undefined) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    dents: [...oldData.dents, createdDent]
                };
            });
        },
        onError: (error) => {
            console.error('Error creating dent:', error);
            toast.error('Failed to create dent. Please try again.');
        }
    });

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex h-48 w-full items-center justify-center">
                    <Spinner />
                </CardContent>
            </Card>
        );
    }

    if (error || !dents || dents.length === 0) {
        return (
            <Card>
                <CardContent className="flex h-48 w-full items-center justify-center">
                    <p className="text-muted-foreground text-center text-sm">No dents available.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex flex-row justify-between">
                    <div>
                        <CardTitle className="mb-2">Dent Details</CardTitle>
                        <CardDescription>About the selected dent.</CardDescription>
                    </div>
                    {isAuthenticated && (
                        <div className="flex flex-row justify-end space-x-4">
                            <div className="space-x-2">
                                <Popover
                                    open={deleteDentPopupOpen}
                                    onOpenChange={setDeleteDentPopupOpen}
                                >
                                    <PopoverTrigger>
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="h-8 w-8 p-2 hover:text-red-600"
                                        >
                                            <Trash2Icon />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56">
                                        <div className="space-y-4">
                                            <div className="mb-2">
                                                <p className="text-lg font-semibold">Delete</p>
                                                <CardDescription className="text-sm">
                                                    Delete the selected dent.
                                                </CardDescription>
                                            </div>
                                            <Button
                                                type="submit"
                                                variant="secondary"
                                                className="mt-6 flex h-8 w-full flex-row items-center justify-between space-x-2 p-4 px-3 pr-2 text-sm hover:bg-red-600"
                                                onClick={() => handleDeleteDent.mutate()}
                                            >
                                                Delete Dent {index + 1}
                                                <CornerDownLeftIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Popover>
                                    <PopoverTrigger>
                                        <Button asChild variant="outline" className="h-8 w-8 p-2">
                                            <PencilIcon />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-76">
                                        <div className="space-y-4">
                                            <div className="mb-6">
                                                <p className="text-lg font-semibold">Update</p>
                                                <CardDescription className="text-sm">
                                                    Modify the selected dent's details.
                                                </CardDescription>
                                            </div>
                                            <div className="mt-1 flex flex-row items-center">
                                                <div className="mr-4 w-48">
                                                    <Label>Minor Axis (mm)</Label>
                                                </div>
                                                <Input
                                                    className="h-8 w-24"
                                                    type="number"
                                                    value={dentAxis.minor}
                                                    onChange={(e) =>
                                                        setDentAxis((prev) => ({
                                                            ...prev,
                                                            minor: Number(e.target.value)
                                                        }))
                                                    }
                                                    step="any"
                                                />
                                            </div>
                                            <div className="mt-2 flex flex-row items-center">
                                                <div className="mr-4 w-48">
                                                    <Label>Major Axis (mm)</Label>
                                                </div>
                                                <Input
                                                    className="h-8 w-24"
                                                    type="number"
                                                    value={dentAxis.major}
                                                    onChange={(e) =>
                                                        setDentAxis((prev) => ({
                                                            ...prev,
                                                            major: Number(e.target.value)
                                                        }))
                                                    }
                                                    step="any"
                                                />
                                            </div>
                                            <div className="flex flex-row items-center justify-end">
                                                <Button
                                                    type="submit"
                                                    variant="secondary"
                                                    className="mt-4 ml-4 h-8 w-8 p-2"
                                                    onClick={() => handleModifyDentAxis.mutate()}
                                                >
                                                    <CornerDownLeftIcon />
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Popover>
                                    <PopoverTrigger>
                                        <Button asChild variant="outline" className="h-8 w-8 p-2">
                                            <PlusIcon />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-76">
                                        <div className="space-y-4">
                                            <div className="mb-6">
                                                <p className="text-lg font-semibold">Create</p>
                                                <CardDescription className="text-sm">
                                                    Save a new dent to the hailpad.
                                                </CardDescription>
                                            </div>
                                            <div className="mt-1 flex flex-row items-center">
                                                <div className="mr-4 w-48">
                                                    <Label>Minor Axis (mm)</Label>
                                                </div>
                                                <Input
                                                    className="h-8 w-28"
                                                    type="number"
                                                    value={newDent.minor}
                                                    onChange={(e) =>
                                                        setNewDent((prev) => ({
                                                            ...prev,
                                                            minor: Number(e.target.value)
                                                        }))
                                                    }
                                                    step="any"
                                                />
                                            </div>
                                            <div className="mt-2 flex flex-row items-center">
                                                <div className="mr-4 w-48">
                                                    <Label>Major Axis (mm)</Label>
                                                </div>
                                                <Input
                                                    className="h-8 w-28"
                                                    type="number"
                                                    value={newDent.major}
                                                    onChange={(e) =>
                                                        setNewDent((prev) => ({
                                                            ...prev,
                                                            major: Number(e.target.value)
                                                        }))
                                                    }
                                                    step="any"
                                                />
                                            </div>
                                            <div className="mt-2 flex flex-row items-center">
                                                <div className="mr-4 w-48">
                                                    <Label>Maximum Depth (mm)</Label>
                                                </div>
                                                <Input
                                                    className="h-8 w-28"
                                                    type="number"
                                                    value={newDent.maxDepth}
                                                    onChange={(e) =>
                                                        setNewDent((prev) => ({
                                                            ...prev,
                                                            maxDepth: Number(e.target.value)
                                                        }))
                                                    }
                                                    step="any"
                                                />
                                            </div>
                                            <div className="mt-2 flex flex-row items-center">
                                                <div className="mr-4 w-48">
                                                    <Label>Dent Location (X, Y)</Label>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Input
                                                        className="h-8 w-20"
                                                        type="number"
                                                        value={newDent.centroidX}
                                                        onChange={(e) =>
                                                            setNewDent((prev) => ({
                                                                ...prev,
                                                                centroidX: Number(e.target.value)
                                                            }))
                                                        }
                                                        placeholder="X"
                                                        step="any"
                                                    />
                                                    <Input
                                                        className="h-8 w-20"
                                                        type="number"
                                                        value={newDent.centroidY}
                                                        onChange={(e) =>
                                                            setNewDent((prev) => ({
                                                                ...prev,
                                                                centroidY: Number(e.target.value)
                                                            }))
                                                        }
                                                        placeholder="Y"
                                                        step="any"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-row items-center justify-end">
                                                <Button
                                                    type="submit"
                                                    variant="secondary"
                                                    className="mt-4 ml-4 h-8 w-8 p-2"
                                                    onClick={() => handleCreateDent.mutate()}
                                                >
                                                    <CornerDownLeftIcon />
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-x-2">
                                <Button
                                    className="h-8 w-8 p-2"
                                    variant="secondary"
                                    onClick={() => onPrevious?.()}
                                >
                                    <ChevronLeftIcon />
                                </Button>
                                <Button
                                    className="h-8 w-8 p-2"
                                    variant="secondary"
                                    onClick={() => onNext?.()}
                                >
                                    <ChevronRightIcon />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="col-span-2">
                    <Detail label="Dent" />
                    <div className="mt-1 flex flex-row items-center gap-2">
                        <Input
                            className="h-8 w-20"
                            type="number"
                            min={1}
                            max={dents.length}
                            placeholder={`${index + 1}`}
                            onChange={(e) => onIndexChange?.(parseInt(e.target.value))}
                        />
                        <p>/</p>
                        <p>{`${dents.length}`}</p>
                        <Button
                            className="ml-2 h-8 w-8 p-2"
                            variant="secondary"
                            size="icon"
                            onClick={() => {
                                onIndexChange?.(index - 1);
                            }}
                        >
                            <CornerDownLeftIcon />
                        </Button>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                    <Detail
                        label="Minor Axis"
                        value={`${Number(dents[index]?.minorAxis).toFixed(2)} mm`}
                    />
                    <Detail
                        label="Major Axis"
                        value={`${Number(dents[index]?.majorAxis).toFixed(2)} mm`}
                    />
                    <Detail
                        label="Maximum Depth"
                        value={`${Number(dents[index]?.maxDepth).toFixed(2)} mm`}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
