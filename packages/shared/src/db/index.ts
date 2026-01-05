import 'dotenv/config';
import { drizzle } from 'drizzle-orm/bun-sql';
import { singleton } from '../utils';
import * as authSchema from './schema/authSchema';
import * as baseSchema from './schema/baseSchema';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables');
}

export const schema = {
    ...baseSchema,
    ...authSchema
};

export const db =
    process.env.NODE_ENV !== 'production'
        ? singleton('db', () =>
              drizzle(process.env.DATABASE_URL!, {
                  schema
              })
          )
        : drizzle(process.env.DATABASE_URL!, {
              schema
          });
