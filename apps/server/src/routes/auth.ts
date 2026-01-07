import type { AppEnv } from '@/index';
import { auth } from '@/lib/auth';
import { Hono } from 'hono';

const router = new Hono<AppEnv>().on(['POST', 'GET'], '/**', (c) => auth.handler(c.req.raw));

export default router;
