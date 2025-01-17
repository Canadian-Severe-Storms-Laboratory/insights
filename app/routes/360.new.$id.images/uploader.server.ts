import { NodeOnDiskFile, UploadHandler } from '@remix-run/node';
import { count, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { finished } from 'node:stream';
import { promisify } from 'node:util';
import { z } from 'zod';
import { db } from '~/db/db.server';
import { captures, pathSegments, paths } from '~/db/schema';
import { env } from '~/env.server';
import { uploadEventBus } from '~/lib/event-bus.server';
import { FrameposSchema } from '~/lib/framepos';

export type UploadProgressEvent = Readonly<{
	id: string;
	percentage: number;
}>;

export const clearUploads = async (folderName: string, pathId: string) => {
	await rm(`${env.PATH_DIRECTORY}/${folderName}`, { recursive: true }).catch(() => {});

	const deleted = await db.delete(pathSegments).where(eq(pathSegments.pathId, pathId)).returning({
		captureId: pathSegments.captureId,
		streetViewId: pathSegments.streetViewId
	});

	if (!deleted) throw new Error('Could not delete segments');

	const captureIds = [
		...deleted.map((segment) => segment.captureId),
		...deleted.map((segment) => segment.streetViewId).filter((id) => id !== null)
	];

	if (captureIds.length > 0)
		await db.delete(captures).where(inArray(captures.id, captureIds as string[]));

	console.log(
		`Deleted ${deleted.length} segments and ${captureIds.length} captures for path ${pathId}`
	);
};

export const buildUploadHandler = ({
	path,
	maxFileSize = 1024 * 1024 * 10
}: {
	path: typeof paths.$inferSelect;
	maxFileSize?: number;
}) => {
	const handler: UploadHandler = async ({ contentType, data, filename }) => {
		if (!contentType) {
			console.error('Missing content type');
			return undefined;
		}

		if (contentType !== 'image/jpeg' && contentType !== 'image/png') {
			console.error('Invalid content type');
			return undefined;
		}

		if (!filename) {
			console.error('Missing filename');
			return undefined;
		}

		// Verify the JSON using the FrameposSchema
		const framepos = z.array(FrameposSchema).safeParse(path.frameposData);

		if (!framepos.success) {
			console.error(framepos.error.errors);
			return undefined;
		}

		const fileNames = framepos.data.map((frame) => frame.jpeg_filename || frame.png_filename);

		if (!fileNames.includes(filename)) {
			console.error('Invalid filename');
			return undefined;
		}

		// Generate a unique filename
		const uniqueFilename = `${nanoid(15)}.${filename.split('.').pop()}`;
		const filePath = `${env.PATH_DIRECTORY}/${path.folderName}/${uniqueFilename}`;

		// Ensure the directory exists
		await mkdir(dirname(filePath), { recursive: true }).catch(() => {});

		// Create a write stream
		const writeStream = createWriteStream(filePath, { flags: 'w' });

		let size = 0;
		let deleteFile = false;

		try {
			for await (const chunk of data) {
				size += chunk.byteLength;

				if (size > maxFileSize) {
					deleteFile = true;
					break;
				}

				writeStream.write(chunk);
			}
		} finally {
			writeStream.end();
			await promisify(finished)(writeStream);

			if (deleteFile) {
				await rm(filePath);
			}
		}

		if (deleteFile) {
			return undefined;
		}

		const match = framepos.data.find(
			(frame) => frame.jpeg_filename === filename || frame.png_filename === filename
		);

		if (!match) {
			console.error('Invalid filename');
			return undefined;
		}

		// Save to the database
		const capture = await db
			.insert(captures)
			.values({
				file_name: uniqueFilename,
				size,
				uploadedAt: new Date(),
				takenAt: new Date(match.systemtime_sec * 1000),
				lng: match.lon.toString(),
				lat: match.lat.toString(),
				altitude: match.altitude.toString(),
				heading: match.heading.toString(),
				distance: match.distance.toString(),
				pitch: match.pitch.toString(),
				roll: match.roll.toString(),
				track: match.track.toString(),
				source: 'ntp'
			})
			.returning({
				id: captures.id
			});

		if (!capture) {
			throw new Error('Could not save capture');
		}

		const segment = await db
			.insert(pathSegments)
			.values({
				captureId: capture[0].id,
				pathId: path.id,
				index: match.frame_index
			})
			.returning({
				id: pathSegments.id
			});

		if (!segment) {
			throw new Error('Could not save segment');
		}

		const totalSegments = (
			await db
				.select({
					count: count(pathSegments.id)
				})
				.from(pathSegments)
				.where(eq(pathSegments.pathId, path.id))
		)[0].count;

		const percentage = path.frameposData ? totalSegments / path.frameposData.length : 0;

		uploadEventBus.emit<UploadProgressEvent>({
			id: path.id,
			percentage
		});

		return new NodeOnDiskFile(filePath, contentType) as unknown as File;
	};

	return handler;
};
