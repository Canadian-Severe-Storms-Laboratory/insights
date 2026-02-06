import { db } from '@insights/shared/db';
import { MagicLinkEmail } from '@insights/transactional/emails';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { resend, resendFromEmail } from './email';

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'pg'
    }),
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path !== '/sign-up/email') {
                return;
            }
            if (!ctx.body?.email.endsWith('@uwo.ca')) {
                throw new APIError('BAD_REQUEST', {
                    message: 'Email must end with @uwo.ca'
                });
            }
        })
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async (data) => {
            if (!resendFromEmail) {
                console.error('RESEND_FROM_EMAIL is not set');
                console.error('Verification URL:', data.url);
                throw new APIError('INTERNAL_SERVER_ERROR', {
                    message: 'Email sending is not configured'
                });
            }
            
            try {
                await resend.emails.send({
                    from: resendFromEmail,
                    to: data.user.email,
                    subject: 'Verify your email for Insights',
                    react: MagicLinkEmail({
                        link: data.url
                    })
                });
            } catch (error) {
                console.error('Failed to send verification email:', error);
                console.error('Verification URL:', data.url);
                throw new APIError('INTERNAL_SERVER_ERROR', {
                    message: 'Failed to send verification email'
                });
            }
        }
    },
    trustedOrigins: process.env.PUBLIC_URL
        ? [process.env.PUBLIC_URL]
        : ['http://localhost:3000', 'http://localhost:5173']
});

export type User = typeof auth.$Infer.Session.user;
