import { connection } from '../connection';
import { Queue } from 'bullmq';

export const HAILPAD_ANALYSIS_QUEUE_NAME = 'hailpad-analysis-queue';

export type HailpadAnalysisTaskData = {
    hailpadId: string;
};

export type HailpadAnalysisTaskResult = {
    success: boolean;
    message?: string;
};

export const hailpadAnalysisQueue = new Queue<HailpadAnalysisTaskData, HailpadAnalysisTaskResult>(HAILPAD_ANALYSIS_QUEUE_NAME, {
    connection
});
