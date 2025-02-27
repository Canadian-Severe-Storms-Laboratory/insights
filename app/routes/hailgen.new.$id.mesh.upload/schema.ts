import { NodeOnDiskFile } from '@remix-run/node';
import { z } from 'zod';

const baseSchema = z.object({
    pairAnalysis: z.enum(['true', 'false']).transform((value) => value === 'true'),
    postMesh: z
        .instanceof(NodeOnDiskFile, {
            message: 'Please select a file.'
        })
        .refine((file) => {
            return file.name.endsWith('.stl');
        }, 'File should be of .stl type.')
});

const pairSchema = baseSchema.extend({
    preMesh: z
        .instanceof(NodeOnDiskFile, {
            message: 'Please select a file.'
        })
        .refine((file) => {
            return file.name.endsWith('.stl');
        }, 'File should be of .stl type.')
});

const schema = z.union([
    baseSchema.refine((data) => !data.pairAnalysis, {
        message: 'Please select a .stl file for the pre-hit mesh.',
        path: ['preMesh']
    }),
    pairSchema
]);

export default schema;
