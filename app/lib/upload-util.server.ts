import { UploadResponse } from './upload-types';

export function buildUploadResponse(
	response:
		| {
				status: 'success';
		  }
		| {
				status: 'error';
				data: {
					message: string;
				};
		  }
		| {
				status: 'redirect';
				data: string;
		  }
): Response {
	switch (response.status) {
		case 'success':
			return new Response(
				JSON.stringify({
					status: 'success'
				} as UploadResponse),
				{
					status: 200,
					statusText: 'OK'
				}
			);
		case 'redirect':
			return new Response(
				JSON.stringify({
					status: 'redirect',
					to: response.data
				} as UploadResponse),
				{
					status: 200,
					statusText: 'OK'
				}
			);
		case 'error':
			return new Response(
				JSON.stringify({
					status: 'error',
					error: response.data
				} as UploadResponse),
				{
					status: 400,
					statusText: 'Bad Request'
				}
			);
	}
}
