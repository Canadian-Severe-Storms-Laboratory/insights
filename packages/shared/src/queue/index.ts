export { connection } from './connection';
export { setupWorkers } from './setup';

export {
    BLUR_QUEUE_NAME,
    blurQueue,
    type BlurTaskData,
    type BlurTaskResult
} from './queues/blur-queue';

export {
    GOOGLE_QUEUE_NAME,
    googleQueue,
    type GoogleTaskData,
    type GoogleTaskResult
} from './queues/google-queue';

export {
    POINT_CLOUD_QUEUE_NAME,
    pointCloudQueue,
    type PointCloudTaskData,
    type PointCloudTaskResult
} from './queues/point-cloud-queue';

export {
    HAILPAD_ANALYSIS_QUEUE_NAME,
    hailpadAnalysisQueue,
    type HailpadAnalysisTaskData,
    type HailpadAnalysisTaskResult
} from './queues/hailpad-analysis-queue';

export {
    DEPTH_MAP_QUEUE_NAME,
    depthMapQueue,
    type DepthMapTaskData,
    type DepthMapTaskResult
} from './queues/depth-map-queue';
