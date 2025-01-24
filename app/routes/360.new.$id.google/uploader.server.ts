import { NodeOnDiskFile, UploadHandler } from '@remix-run/node';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
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
import { PanoramaSchema } from '~/lib/panorama';
import { UploadProgressEvent } from '../360.new.$id.imagesUpload/uploader.server';

export const clearUploads = async (folderName: string, pathId: string) => {
	// Get all street view uploads
	const segments = await db.query.pathSegments.findMany({
		where: and(isNotNull(pathSegments.streetViewId), eq(pathSegments.pathId, pathId))
	});

	// Get all capture and street view ids
	const captureIds = [
		...segments.map((segment) => segment.streetViewId).filter((id) => id !== null)
	];

	// Get all capture filenames
	if (captureIds.length > 0) {
		const captureFileNames = await db.query.captures.findMany({
			where: inArray(captures.id, captureIds),
			columns: {
				id: true,
				file_name: true
			}
		});

		for (const capture of captureFileNames) {
			await deletePanoramaFile(`${env.PATH_DIRECTORY}/${folderName}/${capture.file_name}`);
			await db
				.update(pathSegments)
				.set({ streetViewId: null })
				.where(eq(pathSegments.streetViewId, capture.id));
			await db.delete(captures).where(eq(captures.id, capture.id));
		}
	}
};

export const deletePanoramaFile = async (filePath: string) => {
	try {
		await rm(filePath);
	} catch (error) {
		console.error('Could not delete panorama file', error);
	}
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
		const panoramas = z.record(z.string(), PanoramaSchema).safeParse(path.panoramaData);

		if (!framepos.success) {
			console.error(framepos.error.errors);
			return undefined;
		}

		if (!panoramas.success) {
			console.error(panoramas.error.errors);
			return undefined;
		}

		const fileNames = Object.keys(panoramas.data).map((pano) => `${pano}.jpg`);

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
				await deletePanoramaFile(filePath);
			}
		}

		if (deleteFile) {
			return undefined;
		}

		const panoramaData = panoramas.data[filename.split('.')[0]];

		if (!panoramaData) {
			console.error('Invalid filename');
			await deletePanoramaFile(filePath);
			return undefined;
		}

		// Save to the database
		const capture = await db
			.insert(captures)
			.values({
				file_name: uniqueFilename,
				size,
				uploadedAt: new Date(),
				takenAt: panoramaData.date ? panoramaData.date : new Date(),
				lng: panoramaData.lon.toString(),
				lat: panoramaData.lat.toString(),
				altitude: panoramaData.elevation ? panoramaData.elevation.toString() : null,
				heading: panoramaData.heading ? panoramaData.heading.toString() : null,
				distance: null,
				pitch: panoramaData.pitch ? panoramaData.pitch.toString() : null,
				roll: panoramaData.roll ? panoramaData.roll.toString() : null,
				track: null,
				source: 'google'
			})
			.returning({
				id: captures.id
			});

		if (!capture) {
			await deletePanoramaFile(filePath);
			throw new Error('Could not save capture');
		}

		const frameIndices = framepos.data
			.filter((frame) => frame.pano_id === filename.split('.')[0])
			.map((frame) => frame.frame_index);

		await db
			.update(pathSegments)
			.set({
				streetViewId: capture[0].id
			})
			.where(and(eq(pathSegments.pathId, path.id), inArray(pathSegments.index, frameIndices)));

		const segments = framepos.data.filter((frame) => frame.pano_id !== null).length;
		const completeSegments = await db.query.pathSegments.findMany({
			where: and(isNotNull(pathSegments.streetViewId), eq(pathSegments.pathId, path.id))
		});

		const percentage = completeSegments.length / segments;

		uploadEventBus.emit<UploadProgressEvent>({
			id: path.id,
			percentage
		});

		return new NodeOnDiskFile(filePath, contentType) as File;
	};

	return handler;
};
