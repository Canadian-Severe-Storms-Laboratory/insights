import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { $createPad } from '@/lib/client';
import { cn, isFormFieldInvalid } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { DetailedError, parseResponse } from 'hono/client';
import { toast } from 'sonner';
import { z } from 'zod';

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
            boxfit: 0
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
        <div className="bg-card text-card-foreground mx-auto max-w-md rounded-lg border p-6 shadow-sm">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
                className="space-y-6"
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
                                    placeholder="Enter path name"
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
                                    placeholder="e.g. event-name"
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
                                <Label>Boxfit</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    id={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(Number(e.target.value))}
                                    placeholder="Enter boxfit value"
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

                <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                    {([canSubmit, isSubmitting]) => (
                        <Button type="submit" className="w-full" disabled={!canSubmit}>
                            {isSubmitting ? 'Creating...' : 'Create Hailpad'}
                        </Button>
                    )}
                </form.Subscribe>
            </form>
        </div>
    );
}
