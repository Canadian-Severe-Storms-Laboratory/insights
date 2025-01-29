import { UploadResponse } from './upload-types';

export function buildUploadResponse({
	status,
	data
}:
	| {
			status: 'error';
			data: {
				message: string;
			};
	  }
	| {
			status: 'redirect';
			data: string;
	  }): Response {
	switch (status) {
		case 'redirect':
			return new Response(
				JSON.stringify({
					status: 'redirect',
					to: data
				} as UploadResponse),
				{
					status: 302,
					statusText: 'Found',
					headers: {
						Location: data
					}
				}
			);
		case 'error':
			return new Response(
				JSON.stringify({
					status: 'error',
					error: data
				} as UploadResponse),
				{
					status: 400,
					statusText: 'Bad Request'
				}
			);
	}
}
