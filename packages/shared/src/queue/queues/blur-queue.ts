import { Queue } from 'bullmq';
import { connection } from '../connection';

export const BLUR_QUEUE_NAME = 'blur-queue';

export type BlurTaskData = {
    captureId: string;
};

export type BlurTaskResult = {
    success: boolean;
    message?: string;
};

export const blurQueue = new Queue<BlurTaskData, BlurTaskResult>(BLUR_QUEUE_NAME, { connection });
