import { NodeOnDiskFile } from '@remix-run/node';
import { z } from 'zod';

export default z
	.object({
		pairAnalysis: z.enum(['true', 'false']).transform((value) => value === 'true'),
		postMesh: z
			.instanceof(NodeOnDiskFile, {
				message: 'Please select a file.'
			})
			.refine((file) => {
				return file.name.endsWith('.stl');
			}, 'File should be of .stl type.')
	})
	.refine(
		(data) => {
			if (data.pairAnalysis) {
				return z
					.object({
						preMesh: z
							.instanceof(NodeOnDiskFile, {
								message: 'Please select a file.'
							})
							.refine((file) => {
								return file.name.endsWith('.stl');
							}, 'File should be of .stl type.')
					})
					.safeParse(data).success;
			}
			return true;
		},
		{
			message: 'Please select a .stl file for the pre-hit mesh.',
			path: ['preMesh']
		}
	);
