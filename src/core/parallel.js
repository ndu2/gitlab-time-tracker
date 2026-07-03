import async from 'async';

/**
 * run the given worker over the given tasks with a bounded number of
 * concurrent runners. Rejects on the first worker error.
 * @param tasks   iterable of work items
 * @param worker  async (task) => void — may also be a plain sync function
 * @param config  config instance, supplies the default runner count (_parallel)
 * @param runners max number of concurrent workers, defaults to config._parallel
 * @returns {Promise}
 */
export default function parallel(tasks, worker, config, runners = config.get('_parallel')) {
    return new Promise((resolve, reject) => {
        async.eachLimit(Array.from(tasks), runners, async task => worker(task), error => {
            if (error) return reject(error);
            resolve();
        });
    });
}
