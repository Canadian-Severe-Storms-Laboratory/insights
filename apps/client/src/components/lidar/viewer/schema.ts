import { z } from 'zod';

export const viewerSettingsSchema = z
    .object({
        position: z.tuple([z.number(), z.number(), z.number()]),
        rotation: z.tuple([z.number(), z.number(), z.number()])
    })
    .nullable();

export type ViewerSettings = z.infer<typeof viewerSettingsSchema>;
