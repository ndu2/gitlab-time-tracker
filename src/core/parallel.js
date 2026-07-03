/**
 * run the given worker over the given tasks with a bounded number of
 * concurrent runners. Rejects with the first worker error; no new tasks
 * are started after a failure.
 * @param tasks   iterable of work items
 * @param worker  async (task) => void — may also be a plain sync function
 * @param config  config instance, supplies the default runner count (_parallel)
 * @param runners max number of concurrent workers, defaults to config._parallel
 * @returns {Promise}
 */
export default async function parallel(tasks, worker, config, runners = config.get('_parallel')) {
    const queue = Array.from(tasks);
    let index = 0;
    let failed = false;

    const runner = async () => {
        while (index < queue.length && !failed) {
            const task = queue[index++];
            try {
                await worker(task);
            } catch (error) {
                failed = true;
                throw error;
            }
        }
    };

    const count = Math.min(Math.max(parseInt(runners) || 1, 1), Math.max(queue.length, 1));
    await Promise.all(Array.from({ length: count }, runner));
}
