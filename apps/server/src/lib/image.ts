import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

// Polyfill the global environment
global.DOMParser = DOMParser;
global.XMLSerializer = XMLSerializer;

import { load } from 'exifreader';
import sharp from 'sharp';

function parseDate(date: string): Date {
    const blocks = date.split(/\D/);
    const dateString = `${blocks[0]}-${blocks[1]}-${blocks[2]}T${blocks[3]}:${blocks[4]}:${blocks[5]}`;
    return new Date(dateString);
}

export async function getImageMetadata(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const tags = load(arrayBuffer);

    const latitude = tags.GPSLatitude?.description;
    const latitudeRef = tags.GPSLatitudeRef?.description;
    const longitude = tags.GPSLongitude?.description;
    const longitudeRef = tags.GPSLongitudeRef?.description;
    const heading = tags.GPSImgDirection?.description;
    const altitude = tags.GPSAltitude?.description;
    const pitch = tags.Pitch?.description;
    const roll = tags.Roll?.description;
    const height = tags.ImageHeight?.description || tags['Image Height']?.description;
    const width = tags.ImageWidth?.description || tags['Image Width']?.description;

    const aspectRatio = width && height ? parseFloat(width) / parseFloat(height) : null;

    const takenAt =
        tags.DateTimeOriginal?.description ||
        tags.DateTimeDigitized?.description ||
        tags.DateTime?.description ||
        tags.GPSDateStamp?.description ||
        null;

    let takenAtDate: Date | null = null;
    if (takenAt) {
        // EXIF date format is "2025:09:08 18:50:29"
        const parsedDate = parseDate(takenAt);

        // Check if the date is valid
        if (isNaN(parsedDate.getTime())) {
            console.log(`Invalid date parsed from EXIF: ${takenAt}`);
            takenAtDate = null;
        } else {
            takenAtDate = parsedDate;
        }
    }

    const correctedLatitude =
        latitudeRef === 'South latitude' || latitudeRef === 'S'
            ? latitude
                ? `-${latitude}`
                : null
            : latitude;
    const correctedLongitude =
        longitudeRef === 'West longitude' || longitudeRef === 'W'
            ? longitude
                ? `-${longitude}`
                : null
            : longitude;

    return {
        latitude: correctedLatitude ? parseFloat(correctedLatitude) : null,
        longitude: correctedLongitude ? parseFloat(correctedLongitude) : null,
        heading: heading ? parseFloat(heading) : null,
        altitude: altitude ? parseFloat(altitude) : null,
        pitch: pitch ? parseFloat(pitch) : null,
        roll: roll ? parseFloat(roll) : null,
        takenAt: takenAtDate,
        height: height ? parseInt(height) : null,
        width: width ? parseInt(width) : null,
        aspectRatio
    };
}

/**
 * Finds the minimum and maximum pixel values in an image and their locations.
 * @param imagePath Path to the image
 * @returns Minimum and maximum pixel values and their locations
 */
export async function findMinMaxLocations(imagePath: string) {
    // Load image and convert to grayscale raw pixel data
    const { data, info } = await sharp(imagePath)
        .greyscale() // Simplifies finding min/max intensity
        .raw()
        .toBuffer({ resolveWithObject: true });

    let minVal = 255;
    let maxVal = 0;
    let minLoc = { x: 0, y: 0 };
    let maxLoc = { x: 0, y: 0 };

    for (let i = 0; i < data.length; i++) {
        const value: number | undefined = data[i];
        const x = i % info.width;
        const y = Math.floor(i / info.width);

        if (value === undefined) continue;

        if (value < minVal) {
            minVal = value;
            minLoc = { x, y };
        }
        if (value > maxVal) {
            maxVal = value;
            maxLoc = { x, y };
        }
    }

    return { minVal, minLoc, maxVal, maxLoc };
}
