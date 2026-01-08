import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { $createPath } from '@/lib/client';
import { cn, isFormFieldInvalid } from '@/lib/utils';
import { Arrow } from '@radix-ui/react-dropdown-menu';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { DetailedError, parseResponse } from 'hono/client';
import { ArrowRight, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const createPathSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    folderName: z
        .string()
        .min(1, 'Folder name is required')
        .regex(
            /^[a-zA-Z0-9-_]+$/,
            'Folder name can only contain letters, numbers, hyphens, and underscores'
        ),
    eventDate: z.date('Event date is required'),
    captureDate: z.date('Capture date is required')
});

export function CreatePathForm() {
    const navigate = useNavigate();
    const form = useForm({
        defaultValues: {
            name: '',
            folderName: '',
            eventDate: undefined as unknown as Date, // Initial state for required dates
            captureDate: undefined as unknown as Date
        },
        validators: {
            onChange: createPathSchema
        },
        onSubmit: async ({ value }) => {
            try {
                const result = await parseResponse(
                    $createPath({
                        form: {
                            name: value.name,
                            folderName: value.folderName,
                            eventDate: value.eventDate.toISOString(),
                            captureDate: value.captureDate.toISOString()
                        }
                    })
                );

                navigate({ to: '/360/new/$id/captures', params: { id: result.path.id } });
            } catch (error) {
                const message =
                    error instanceof DetailedError ? error.message : 'Please try again.';
                toast.error(`Failed to create path. ${message}`);
                console.error('Failed to create path:', error);
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
                    <form.Field
                        name="name"
                        children={(field) => (
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
                    />

                    <form.Field
                        name="folderName"
                        children={(field) => (
                            <div className="space-y-2">
                                <Label htmlFor={field.name}>Folder Name</Label>
                                <Input
                                    id={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    placeholder="e.g., event-name"
                                    className={cn(
                                        field.state.meta.errors.length > 0 && 'border-destructive'
                                    )}
                                />
                                {isFormFieldInvalid(field) && (
                                    <FieldError errors={field.state.meta.errors} />
                                )}
                            </div>
                        )}
                    />

                    <form.Field
                        name="eventDate"
                        children={(field) => (
                            <div className="flex flex-col space-y-2">
                                <Label>Event Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn(
                                                'w-full pl-3 text-left font-normal',
                                                !field.state.value && 'text-muted-foreground',
                                                field.state.meta.errors.length > 0 &&
                                                    'border-destructive'
                                            )}
                                        >
                                            {field.state.value ? (
                                                format(field.state.value, 'PPP')
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.state.value}
                                            onSelect={(date) => field.handleChange(date as Date)}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date('1900-01-01')
                                            }
                                        />
                                    </PopoverContent>
                                </Popover>
                                {isFormFieldInvalid(field) && (
                                    <FieldError errors={field.state.meta.errors} />
                                )}
                            </div>
                        )}
                    />

                    <form.Field
                        name="captureDate"
                        children={(field) => (
                            <div className="flex flex-col space-y-2">
                                <Label>Capture Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={'outline'}
                                            className={cn(
                                                'w-full pl-3 text-left font-normal',
                                                !field.state.value && 'text-muted-foreground',
                                                field.state.meta.errors.length > 0 &&
                                                    'border-destructive'
                                            )}
                                        >
                                            {field.state.value ? (
                                                format(field.state.value, 'PPP')
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.state.value}
                                            onSelect={(date) => field.handleChange(date as Date)}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date('1900-01-01')
                                            }
                                        />
                                    </PopoverContent>
                                </Popover>
                                {isFormFieldInvalid(field) && (
                                    <FieldError errors={field.state.meta.errors} />
                                )}
                            </div>
                        )}
                    />
                </div>

                <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                    children={([canSubmit, isSubmitting]) => (
                        <Button type="submit" className="flex w-full justify-between" disabled={!canSubmit}>
                            {isSubmitting ? 'Creating...' : 'Create Path and Continue'}
                            <ArrowRight />
                        </Button>
                    )}
                />
            </form>
        </div>
    );
}
