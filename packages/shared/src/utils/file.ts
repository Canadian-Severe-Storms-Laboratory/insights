import { mkdir } from 'fs/promises';

interface FileLocation {
    folderName: string;
    fileName: string;
    type: 'captures' | 'scans' | 'hailpads';
}

interface FileParams extends FileLocation {
    file: File;
}

export function getFileDirectory({ folderName, type }: Omit<FileLocation, 'fileName'>): string {
    return `${process.env.BASE_UPLOAD_DIR}/${type}/${folderName}`;
}

export function getFilePath({ folderName, fileName, type }: FileLocation): string {
    const directory = getFileDirectory({ folderName, type });
    return `${directory}/${fileName}`;
}

export async function deleteFile({ folderName, fileName, type }: FileLocation) {
    const fileLocation = getFilePath({ folderName, fileName, type });
    try {
        await Bun.file(fileLocation).delete();
    } catch (error) {
        console.error(`[${folderName}][${fileName}] Error deleting file`, error);
    }
}

export async function saveFile({ file, folderName, fileName, type }: FileParams): Promise<
    | {
          success: true;
          deleteCallback: () => Promise<void>;
      }
    | {
          success: false;
          error: string;
      }
> {
    const directory = getFileDirectory({ folderName, type });
    const fileLocation = getFilePath({ folderName, fileName, type });

    // Create directory if it doesn't exist
    try {
        await mkdir(directory, { recursive: true });
    } catch (error) {
        console.error(`[${folderName}][${fileName}] Error creating directory`, error);
        return {
            success: false,
            error: 'Error creating directory'
        };
    }

    try {
        const fileBuffer = await file.arrayBuffer();
        await Bun.write(fileLocation, new Uint8Array(fileBuffer));
    } catch (error) {
        console.error(`[${folderName}][${fileName}] Error saving capture file`, error);
        return {
            success: false,
            error: 'Error saving file'
        };
    }

    return {
        success: true,
        deleteCallback: async () => {
            try {
                await Bun.file(fileLocation).delete();
            } catch (error) {
                console.error(
                    `[${folderName}][${fileName}] Error deleting capture file after failure`,
                    error
                );
            }
        }
    };
}
