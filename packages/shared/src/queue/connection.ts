import Redis from 'ioredis';

declare global {
    // eslint-disable-next-line no-var
    var redis: Redis | undefined;
}

export const connection =
    globalThis.redis ||
    new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined,
        maxRetriesPerRequest: null
    });

if (process.env.NODE_ENV !== 'production') {
    globalThis.redis = connection;
}
