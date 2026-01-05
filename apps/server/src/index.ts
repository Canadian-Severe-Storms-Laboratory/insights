import { db } from '@insights/shared/db';

import { Hono } from 'hono';
import { auth, type User } from './lib/auth';

import { serveStatic } from 'hono/bun';
import path360Router from './routes/360';
import authRouter from './routes/auth';
import hailgenRouter from './routes/hailgen';
import lidarRouter from './routes/lidar';

export type AppEnv = {
    Variables: {
        user: User | null;
    };
};

const apiRouter = new Hono<AppEnv>()
    .route('/lidar', lidarRouter)
    .route('/360', path360Router)
    .route('/hailgen', hailgenRouter);

const app = new Hono<AppEnv>()
    .use(async (c, next) => {
        const session = await auth.api.getSession(c.req.raw);
        c.set('user', session?.user || null);
        await next();
    })
    .route('/api', apiRouter)
    .route('/api/auth', authRouter);

export type AppType = typeof app;

// If it is a request outside of the /api path, serve the client files
app.use('/*', serveStatic({ root: process.env.CLIENT_DIST_PATH || '../client/dist' }));
app.use(
    '*',
    serveStatic({ path: 'index.html', root: process.env.CLIENT_DIST_PATH || '../client/dist' })
);

const server = Bun.serve({
    development: process.env.NODE_ENV === 'development',
    fetch: app.fetch,
    port: 3000,
    maxRequestBodySize: 6 * 1024 * 1024 * 1024 // 6 GB
});

console.log(`Server running at http://localhost:${server.port}`);

async function shutdown() {
    await server.stop();
    await db.$client.end();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
