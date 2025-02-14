import {
	unstable_composeUploadHandlers,
	unstable_createFileUploadHandler,
	unstable_createMemoryUploadHandler
} from '@remix-run/node';
import { hailpad } from '~/db/schema';
import { env } from '~/env.server';

export const buildUploadHandler = ({
	pad,
	maxFileSize = 1024 * 1024 * 1024
}: {
	pad: typeof hailpad.$inferSelect;
	maxFileSize?: number;
}) => {
	const filePath = `${env.HAILPAD_DIRECTORY}/${pad.folderName}`;

	const handler = unstable_composeUploadHandlers(
		unstable_createFileUploadHandler({
			maxPartSize: maxFileSize,
			filter: (file) => {
				if (!file.filename) return false;
				return file.filename.endsWith('.stl');
			},
			directory: filePath,
			avoidFileConflicts: false,
			file({ name }) {
				if (name === 'preMesh') return 'pre-hailpad.stl';
				if (name === 'postMesh') return 'post-hailpad.stl';
				return name;
			}
		}),
		unstable_createMemoryUploadHandler()
	);

	return handler;
};
