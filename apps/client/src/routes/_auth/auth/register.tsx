import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/authClient';
import { useForm } from '@tanstack/react-form';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';

const registerFormSchema = z
    .object({
        name: z.string(),
        email: z.email().refine((email) => email.endsWith('@uwo.ca'), {
            message: 'Email must be a valid @uwo.ca address.'
        }),
        password: z
            .string()
            .min(8)
            .refine((password) => /[A-Z]/.test(password), {
                message: 'Password must contain at least one uppercase letter.'
            })
            .refine((password) => /[a-z]/.test(password), {
                message: 'Password must contain at least one lowercase letter.'
            })
            .refine((password) => /[0-9]/.test(password), {
                message: 'Password must contain at least one number.'
            })
            .refine((password) => /[!@#$%^&*()]/.test(password), {
                message: 'Password must contain at least one special character.'
            }),
        confirmPassword: z.string()
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match.',
        path: ['confirmPassword']
    });

export const Route = createFileRoute('/_auth/auth/register')({
    head: () => ({
        meta: [
            {
                title: 'CSSL Insights - Register'
            }
        ]
    }),
    component: RouteComponent,
    beforeLoad: async ({ context }) => {
        const isAuthenticated = Boolean(context.auth?.isAuthenticated);

        if (isAuthenticated) {
            return {
                redirect: '/'
            };
        }
    }
});

function RouteComponent() {
    const navigate = useNavigate();
    const registerForm = useForm({
        defaultValues: {
            email: '',
            name: '',
            password: '',
            confirmPassword: ''
        },
        validators: {
            onSubmit: registerFormSchema
        },
        onSubmit: async ({ value }) => {
            try {
                const result = await authClient.signUp.email({
                    ...value,
                    callbackURL: window.location.origin
                });

                if (result.error) {
                    toast.error('Failed to register user. Please try again.', {
                        description: result.error.message
                    });
                    console.error('Failed to register user:', result.error);
                    return;
                }

                navigate({
                    to: '/'
                });
            } catch (error) {
                toast.error('Error registering user. Please try again.', {
                    description: 'Check the console for more details.'
                });
                console.error('Error registering user:', error);
            }
        }
    });

    return (
        <div className="mx-auto grid h-min w-[350px] gap-3">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Register</h1>
                <p className="text-muted-foreground text-balance">
                    Create an account to get started.
                </p>
            </div>
            <form
                className="grid gap-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    registerForm.handleSubmit(e);
                }}
            >
                <registerForm.Field name="name">
                    {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>Name (optional)</FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    aria-invalid={isInvalid}
                                    placeholder="Your name"
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                        );
                    }}
                </registerForm.Field>
                <registerForm.Field name="email">
                    {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    type="email"
                                    aria-invalid={isInvalid}
                                    placeholder="example@uwo.ca"
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                        );
                    }}
                </registerForm.Field>
                <registerForm.Field name="password">
                    {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    type="password"
                                    aria-invalid={isInvalid}
                                    placeholder="Your password"
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                        );
                    }}
                </registerForm.Field>
                <registerForm.Field name="confirmPassword">
                    {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>Confirm Password</FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    type="password"
                                    aria-invalid={isInvalid}
                                    placeholder="Confirm your password"
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                        );
                    }}
                </registerForm.Field>
                <Button type="submit" className="mt-4 w-full">
                    Register
                </Button>
            </form>
        </div>
    );
}
