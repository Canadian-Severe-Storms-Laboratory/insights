import { z } from 'zod';

export const idSchema = z.object({
    id: z.uuid()
});

export const folderNameSchema = z
    .string()
    .min(1)
    .regex(
        /^[a-zA-Z0-9-_]+$/,
        'Folder name can only contain letters, numbers, hyphens, and underscores'
    );

export const dateStringSchema = z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format'
});
