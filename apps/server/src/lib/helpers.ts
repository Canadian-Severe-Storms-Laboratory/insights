export function createErrorResponse(message: string) {
    return {
        error: {
            message
        }
    };
}

export function parseRangeHeader(rangeHeader: string | null, totalSize: number) {
    if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
        return null;
    }

    const ranges = rangeHeader
        .substring(6)
        .split(',')
        .map((part) => {
            const [startStr, endStr] = part.split('-').map((s) => s.trim());
            if (!startStr) {
                return null;
            }
            let start = parseInt(startStr, 10);
            let end = endStr ? parseInt(endStr, 10) : totalSize - 1;

            if (isNaN(start)) {
                start = totalSize - end;
                end = totalSize - 1;
            }
            if (isNaN(end) || end >= totalSize) {
                end = totalSize - 1;
            }

            if (start > end || start < 0 || end < 0) {
                return null;
            }

            return { start, end };
        })
        .filter((r) => r !== null) as { start: number; end: number }[];

    return ranges.length > 0 ? ranges : null;
}
