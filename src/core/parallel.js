import async from 'async';

/**
 * run the given async worker over the given tasks with a bounded
 * number of concurrent runners.
 * @param tasks   iterable of work items
 * @param worker  (task, done) => void — node-style async callback per item
 * @param config  config instance, supplies the default runner count (_parallel)
 * @param runners max number of concurrent workers, defaults to config._parallel
 * @returns {Promise}
 */
export default function parallel(tasks, worker, config, runners = config.get('_parallel')) {
    return new Promise((resolve, reject) => {
        async.eachLimit(Array.from(tasks), runners, worker, error => {
            if (error) return reject(error);
            resolve();
        });
    });
}
