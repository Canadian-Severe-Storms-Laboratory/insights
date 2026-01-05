import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/authClient';
import { useForm } from '@tanstack/react-form';
import { createFileRoute, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';

const loginFormSchema = z.object({
    email: z.email().refine((email) => email.endsWith('@uwo.ca'), {
        message: 'Email must be a valid @uwo.ca address.'
    }),
    password: z.string().min(8)
});

export const Route = createFileRoute('/_auth/auth/login')({
    head: () => ({
        meta: [
            {
                title: 'CSSL Insights - Login'
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
    const loginForm = useForm({
        defaultValues: {
            email: '',
            password: ''
        },
        validators: {
            onSubmit: loginFormSchema
        },
        onSubmit: async ({ value }) => {
            try {
                const result = await authClient.signIn.email({
                    ...value,
                    callbackURL: window.location.origin
                });

                if (result.error) {
                    toast.error(`Login failed: ${result.error.statusText || 'Unknown error'}`);
                    return;
                }
            } catch (error) {
                toast.error('An unexpected error occurred during login.');
                console.error('Login error:', error);
                return;
            }
        }
    });

    return (
        <div className="mx-auto grid h-min w-[350px] gap-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Login</h1>
                <p className="text-muted-foreground text-balance">
                    Login with your email to continue.
                </p>
            </div>
            <form
                className="grid gap-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    loginForm.handleSubmit(e);
                }}
            >
                <loginForm.Field name="email">
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
                </loginForm.Field>
                <loginForm.Field name="password">
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
                </loginForm.Field>
                <loginForm.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                    children={([canSubmit, isSubmitting]) => (
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={!canSubmit || isSubmitting}
                        >
                            {isSubmitting ? 'Logging in...' : 'Login'}
                        </Button>
                    )}
                />
                <Link to="/auth/register">
                    <Button type="button" variant="secondary" className="w-full">
                        Register
                    </Button>
                </Link>
            </form>
        </div>
    );
}
