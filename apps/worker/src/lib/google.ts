import { type Panorama, PanoramaSchema } from './panorama';

type Position = {
    lat: number;
    lng: number;
};

const regex = /callbackfunc\((.*)\)/;

export async function getStreetViewImage(position: Position) {
    const url = `https://maps.googleapis.com/maps/api/js/GeoPhotoService.SingleImageSearch?pb=!1m5!1sapiv3!5sUS!11m2!1m1!1b0!2m4!1m2!3d${position.lat}!4d${position.lng}!2d50!3m10!2m2!1sen!2sGB!9m1!1e2!11m4!1m3!1e2!2b1!3e2!4m10!1e1!1e2!1e3!1e4!1e8!1e6!5m1!1e2!6m1!1e2&callback=callbackfunc`;
    const response = await fetch(new URL(url));

    if (!response.ok) {
        throw new Error('Failed to fetch image');
    }

    const text = await response.text();
    const matches = text.match(regex);

    if (!matches) {
        throw new Error('Failed to parse image');
    }

    const data = JSON.parse(matches[1]!);

    // No images found
    if (JSON.stringify(data) === JSON.stringify([[5, 'generic', 'Search returned no images.']])) {
        return null;
    }

    const subset = data[1][5][0];
    let rawPanoramas: string[] = subset[3][0];

    let rawDates: any[] = [];

    if (subset.length >= 9 && subset[8] !== null) {
        rawDates = subset[8];
    }

    rawPanoramas.reverse();
    rawDates.reverse();

    const dates = rawDates.map((date) => `${date[1][0]}-${date[1][1].toString().padStart(2, '0')}`);

    if (!rawPanoramas.length) return null;

    const panorama = PanoramaSchema.safeParse({
        id: rawPanoramas[0]![0]![1],
        lat: Number(rawPanoramas[0]![2]![0]![2]),
        lon: Number(rawPanoramas[0]![2]![0]![3]),
        heading: Number(rawPanoramas[0]![2]![2]![0]),
        pitch: rawPanoramas[0]![2]![2]!.length >= 2 ? Number(rawPanoramas[0]![2]![2]![1]) : null,
        roll: rawPanoramas[0]![2]![2]!.length >= 3 ? Number(rawPanoramas[0]![2]![2]![2]) : null,
        date: new Date(dates[0]!),
        elevation:
            rawPanoramas[0]!.length >= 4
                ? Number(rawPanoramas[0]![3]![0]) !== 0
                    ? Number(rawPanoramas[0]![3]![0])
                    : null
                : null
    } as Panorama);

	if (!panorama.success) {
		return null;
	}

    return panorama.data;
}
