import type { Dents, Pad } from '@/lib/client';
import * as XLSX from 'xlsx';
import { HAILPAD_IMAGE_SIZE } from './helpers';

export function generateHailpadExcelFile(pad: Pad, dents: Dents) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);

    // Add headers
    XLSX.utils.sheet_add_aoa(
        ws,
        [
            [
                'Dent #',
                'Minor Axis (mm)',
                'Major Axis (mm)',
                'Max. Depth (mm)',
                'Centroid (x, y)',
                'Angle (rad)'
            ]
        ],
        { origin: 'A1' }
    );

    const headerStyle = {
        font: { bold: true },
        alignment: { horizontal: 'center' },
        fill: { fgColor: { rgb: 'BFBFBF' } }
    };

    ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach((cell) => {
        if (!ws[cell]) ws[cell] = {};
        ws[cell].s = headerStyle;
    });

    // --- Dent data table ---
    XLSX.utils.sheet_add_aoa(
        ws,
        [
            [
                'Dent #',
                'Minor Axis (mm)',
                'Major Axis (mm)',
                'Max. Depth (mm)',
                'Centroid (x, y)',
                'Angle (rad)'
            ]
        ],
        { origin: 'A1' }
    );

    ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach((cell) => {
        if (!ws[cell]) ws[cell] = {};
        ws[cell].s = headerStyle;
    });

    const dentRows = dents.map((dent, index) => [
        { v: index + 1, t: 'n' },
        { f: `$H$2*${Number(dent.minorAxis) / HAILPAD_IMAGE_SIZE}`, t: 'n' },
        { f: `$H$2*${Number(dent.majorAxis) / HAILPAD_IMAGE_SIZE}`, t: 'n' },
        { f: `$H$3*${Number(dent.maxDepth)}`, t: 'n' },
        `(${dent.centroidX}, ${dent.centroidY})`,
        dent.angle || ''
    ]);
    XLSX.utils.sheet_add_aoa(ws, dentRows, { origin: 'A2' });

    // --- Hailpad parameters table ---
    const paramStyle = {
        font: { bold: true },
        alignment: { horizontal: 'center' },
        fill: { fgColor: { rgb: 'BFBFBF' } }
    };

    XLSX.utils.sheet_add_aoa(
        ws,
        [
            ['Hailpad Parameters', ''],
            ['Box-fitting Length (mm)', Number(pad.boxfit)],
            ['Max. Depth (mm)', Number(pad.maxDepth)]
        ],
        { origin: 'G1' }
    );

    ws['G1'].s = paramStyle;
    ws['G2'].s = { font: { bold: true } };
    ws['G3'].s = { font: { bold: true } };

    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 6 }, e: { r: 0, c: 7 } });

    ws['!cols'] = [
        { width: 8 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 12 },
        { width: 20 },
        { width: 15 }
    ];

    for (let i = 2; i <= dents.length + 1; i++) {
        ['B', 'C', 'D'].forEach((col) => {
            const cell = ws[`${col}${i}`];
            if (cell) cell.z = '0.00'; // (Rounding to 2 decimal places)
        });
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Hailpad Data');
    XLSX.writeFile(wb, `${pad.name}.xlsx`);
}
