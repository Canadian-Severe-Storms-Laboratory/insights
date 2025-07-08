import { eq } from 'drizzle-orm';
import { Authenticator } from 'remix-auth';
import { TOTPStrategy } from 'remix-auth-totp';
import { db } from '~/db/db.server';
import { users, validEmails } from '~/db/schema';
import { env } from '~/env.server';
import { sendCode } from './email.server';
import { authSessionResolver } from './sessions.server';

export const authenticator = new Authenticator<typeof users.$inferSelect.id>(authSessionResolver);

authenticator.use(
	new TOTPStrategy(
		{
			validateEmail: async (email) => {
				// Check if email is in the valid_emails table
				const validEmail = await db.query.validEmails.findFirst({
					where: eq(validEmails.email, email)
				});

				if (validEmail && validEmail.enabled) {
					return true;
				}

				return false;
			},
			totpGeneration: {
				charSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
				period: 60 * 10, // 10 minutes
			},
			maxAge: 60 * 60 * 24,
			magicLinkPath: '/auth/magic-link',
			secret: env.AUTH_SECRET,
			customErrors: {
				invalidEmail: 'Invalid email. Please try another.'
			},
			sendTOTP: async ({ email, code, magicLink }) => {
				if (process.env.NODE_ENV === 'development') {
					console.log('[Dev] TOTP Code:', code);
					console.log('[Dev] Magic Link:', magicLink);
				} else {
					await sendCode({
						to: email,
						code,
						magicLink
					});
				}
			}
		},
		async ({ email }) => {
			let user = await db.query.users.findFirst({
				where: eq(users.email, email)
			});

			if (!user) {
				const insert = await db.insert(users).values({ email }).returning();

				if (insert.length !== 1) {
					throw new Error('Failed to create user');
				}

				user = insert[0];
			}

			return user.id;
		}
	)
);

export async function protectedRoute(request: Request) {
	const userId = await authenticator.isAuthenticated(request);

	if (!userId) {
		throw new Response(null, {
			status: 401,
			statusText: 'Unauthorized'
		});
	}

	return userId;
}
