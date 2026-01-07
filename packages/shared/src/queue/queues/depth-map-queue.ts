import { Queue } from 'bullmq';
import { connection } from '../connection';

export const DEPTH_MAP_QUEUE_NAME = 'depth-map-queue';

export type DepthMapTaskData = {
    hailpadId: string;
};

export type DepthMapTaskResult = {
    success: boolean;
    message?: string;
};

export const depthMapQueue = new Queue<DepthMapTaskData, DepthMapTaskResult>(DEPTH_MAP_QUEUE_NAME, {
    connection
});
