export type UploadResponse = {
	status: 'error';
	error: {
		message: string;
	};
} | {
	status: 'redirect';
	to: string;
};

export const unknownError: UploadResponse = {
	status: 'error',
	error: {
		message: 'Unknown error. Check server logs'
	}
};
