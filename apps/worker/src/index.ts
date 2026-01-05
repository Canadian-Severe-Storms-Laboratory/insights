import { setupWorkers } from '@insights/shared/queue';
import { blurWorker } from './tasks/blur-task';
import { depthMapWorker } from './tasks/depth-map-task';
import { googleWorker } from './tasks/google-task';
import { hailpadAnalysisWorker } from './tasks/hailpad-analysis-worker';

setupWorkers([googleWorker, blurWorker, depthMapWorker, hailpadAnalysisWorker]);
