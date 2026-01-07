import { Worker } from 'bullmq';

export function setupWorkers(workers: Worker | Worker[], onShutdown?: () => Promise<void>) {
    const addListeners = (worker: Worker, taskName: string) => {
        worker.on('active', (job) => {
            console.log(`'${taskName}' task started for job ID: ${job.id}`);
        });

        worker.on('completed', (job, result) => {
            console.log(`'${taskName}' task completed for job ID: ${job.id} with result:`, result);
        });

        worker.on('failed', (job, err) => {
            console.error(`'${taskName}' task failed for job ID: ${job?.id} with error:`, err);
        });
    };

    const workersArray = Array.isArray(workers) ? workers : [workers];

    for (const worker of workersArray) {
        addListeners(worker, worker.name);
    }
    
    console.log('Started workers...');

    async function shutdown() {
        for (const worker of workersArray) {
            await worker.close();
        }
        if (onShutdown) {
            await onShutdown();
        }
        process.exit(0);
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
