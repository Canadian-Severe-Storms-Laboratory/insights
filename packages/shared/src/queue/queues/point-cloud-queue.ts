import { Queue } from 'bullmq';
import { connection } from '../connection';

export const POINT_CLOUD_QUEUE_NAME = 'point-cloud-queue';

export type PointCloudTaskData = {
    scanId: string;
    scanFileName: string;
};

export type PointCloudTaskResult = {
    success: boolean;
    message?: string;
};

export const pointCloudQueue = new Queue<PointCloudTaskData, PointCloudTaskResult>(
    POINT_CLOUD_QUEUE_NAME,
    { connection }
);
