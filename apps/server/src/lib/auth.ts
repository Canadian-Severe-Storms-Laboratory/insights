import { db } from '@insights/shared/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';

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
            console.log(`Send verification email to ${data.user.email} with link: ${data.url}`);
        }
    },
    trustedOrigins: process.env.PUBLIC_URL ? [process.env.PUBLIC_URL] : ['http://localhost:3000', 'http://localhost:5173']
});

export type User = typeof auth.$Infer.Session.user;
