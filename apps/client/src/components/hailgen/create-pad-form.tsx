import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { $createPad } from '@/lib/client';
import { cn, isFormFieldInvalid } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { ArrowRight, Info } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CardDescription } from '../ui/card';
import { BoxfitDiagram } from './boxfit-diagram';

const createScanSchema = z.object({
    name: z
        .string()
        .min(3, 'Name must be at least 3 characters')
        .max(255, 'Name must be at most 255 characters'),
    folderName: z
        .string()
        .min(1, 'Folder name is required')
        .regex(
            /^[a-zA-Z0-9-_]+$/,
            'Folder name can only contain letters, numbers, hyphens, and underscores'
        ),
    boxfit: z.number().min(0, 'Boxfit must be at least 0')
});

export function CreatePadForm() {
    const navigate = useNavigate();
    const form = useForm({
        defaultValues: {
            name: '',
            folderName: '',
            boxfit: 600
        },
        validators: {
            onChange: createScanSchema
        },
        onSubmit: async ({ value }) => {
            try {
                const result = await parseResponse(
                    $createPad({
                        form: {
                            name: value.name,
                            folderName: value.folderName,
                            boxfit: String(value.boxfit)
                        }
                    })
                );

                navigate({ to: '/hailgen/new/$id/upload', params: { id: result.pad.id } });
            } catch (error) {
                const message =
                    error instanceof DetailedError ? error.message : 'Please try again.';

                const detailedMessage: {
                    data: {
                        error: {
                            message: string;
                        };
                    };
                } | null = error instanceof DetailedError ? error.detail : null;

                toast.error(
                    `Failed to create pad. ${detailedMessage?.data?.error?.message || message}`
                );
                console.error('Failed to create pad:', error);
            }
        }
    });

    return (
        <div className="bg-card text-card-foreground mx-auto min-w-xs max-w-[500px] rounded-lg border p-6 shadow-sm">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
                className="space-y-6 min-h-fit h-[300px] flex flex-col justify-between"
            >
                <div className="space-y-4">
                    <form.Field name="name">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Name</Label>
                                <Input
                                    id={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    placeholder="Enter hailpad name"
                                    className={cn(
                                        field.state.meta.errors.length > 0 && 'border-destructive'
                                    )}
                                />
                                {isFormFieldInvalid(field) && (
                                    <FieldError errors={field.state.meta.errors} />
                                )}
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="folderName">
                        {(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Folder Name</Label>
                                <Input
                                    id={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    placeholder="e.g., hailpad-name"
                                    className={cn(
                                        field.state.meta.errors.length > 0 && 'border-destructive'
                                    )}
                                />
                                {isFormFieldInvalid(field) && (
                                    <FieldError errors={field.state.meta.errors} />
                                )}
                            </div>
                        )}
                    </form.Field>

                    <form.Field name="boxfit">
                        {(field) => (
                            <div className="flex flex-col space-y-2">
                                <div className="flex space-x-2">
                                    <Label>Box-fitting Length</Label>
                                    <Popover>
                                        <PopoverTrigger>
                                            <Info className="ml-1" size={12} />
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[420px]">
                                            <div className="space-y-4">
                                                <div className="flex grid-cols-2 gap-2">
                                                    <BoxfitDiagram size={300} className="h-fit" />
                                                    <div className="mb-2 w-fit">
                                                        <p className="text-lg font-semibold">About Box-fitting Length</p>
                                                        <CardDescription className="text-sm">
                                                            The box-fitting length (<span className="italic">l</span>) is the
                                                            largest length of the smallest box that can enclose the hailpad,
                                                            measured in mm. This value is used to map pixel measurements to
                                                            real-world units.
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <Input
                                    type="number"
                                    min={0}
                                    id={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(Number(e.target.value))}
                                    placeholder="Enter box-fitting length value"
                                    className={cn(
                                        field.state.meta.errors.length > 0 && 'border-destructive'
                                    )}
                                />
                                {isFormFieldInvalid(field) && (
                                    <FieldError errors={field.state.meta.errors} />
                                )}
                            </div>
                        )}
                    </form.Field>
                </div>
                <div className="flex justify-end">
                    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                        {([canSubmit, isSubmitting]) => (
                            <Button type="submit" className="flex min-w-[200px] gap-2 w-fit" disabled={!canSubmit}>
                                {isSubmitting ? 'Creating...' : 'Create Hailpad and Continue'}
                                <ArrowRight />
                            </Button>
                        )}
                    </form.Subscribe>
                </div>
            </form>
        </div>
    );
}
