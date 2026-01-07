import { connection } from '../connection';
import { Queue } from 'bullmq';

export const GOOGLE_QUEUE_NAME = 'google-queue';

export type GoogleTaskData = {
    segmentId: string;
};

export type GoogleTaskResult = {
    success: boolean;
    message?: string;
};

export const googleQueue = new Queue<GoogleTaskData, GoogleTaskResult>(GOOGLE_QUEUE_NAME, { connection });
