import { setupWorkers } from '@insights/shared/queue';
import { pointCloudWorker } from './tasks/point-cloud-task';

setupWorkers(pointCloudWorker);
