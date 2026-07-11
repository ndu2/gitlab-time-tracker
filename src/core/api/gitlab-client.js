import crypto from 'crypto';
import { throttledQueue } from 'throttled-queue';
import parallel from '../parallel.js';

/**
 * GitLab REST/GraphQL client: owns the request throttle, single/parallel
 * paginated GET, POST and GraphQL. Root of the API-model hierarchy.
 */
class GitlabClient {
    static throttle;

    static init(config) {
        if(GitlabClient.throttle == undefined){
            GitlabClient.throttle = throttledQueue({
                maxPerInterval: config.data.throttleMaxRequestsPerInterval,
                interval: config.data.throttleInterval
            });
        }
    }


    /**
     * construct
     * @param config
     */
    constructor(config) {
        GitlabClient.init(config);
        this.config = config;

        this.url = config.get('url').endsWith('/') ? config.get('url') : `${config.get('url')}/`;
        this.token = config.get('token');

        this._perPage = this.config ? this.config.get('_perPage') : 100;
        this._parallel = this.config ? this.config.get('_parallel') : 4;
    }

    /**
     * query the given path
     * @param path
     * @param data
     * @returns {Promise}
     */
    post(path, data) {
        return GitlabClient.throttle(async () => {
            const response = await fetch(`${this.url}${path}`, {
                method: 'POST',
                headers: {
                    'PRIVATE-TOKEN': this.token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            await GitlabClient.assertOk(response, 'POST', path);

            const isJson = (response.headers.get('content-type') ?? '').startsWith('application/json');
            const body = isJson ? await response.json() : undefined;

            return { body, headers: response.headers };
        });
    }

    /**
     * throw a descriptive error if the response is not OK
     * @param response
     * @param method
     * @param path
     */
    static async assertOk(response, method, path) {
        if (response.ok) return;

        let body = '';
        try {
            body = (await response.text()).slice(0, 512);
        } catch { /* body is optional error context */ }

        throw new Error(`${method} ${path} failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`);
    }

    /**
     * throw if the response is not JSON
     * @param response
     * @param method
     * @param path
     */
    static assertJson(response, method, path) {
        const contentType = response.headers.get('content-type') ?? '';

        if (!contentType.startsWith('application/json'))
            throw new Error(`${method} ${path} returned content-type "${contentType}", expected application/json`);
    }


    /**
     * query the given path
     * @param data
     * @returns {Promise}
     */
    graphQL(data) {
        // remove v4/ from url, add graphql
        const path = this.url.substr(0, this.url.length-3) + 'graphql';

        return GitlabClient.throttle(async () => {
            const response = await fetch(`${path}`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer '+this.token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            await GitlabClient.assertOk(response, 'POST', path);
            GitlabClient.assertJson(response, 'POST', path);

            return { body: await response.json(), headers: response.headers };
        });
    }


    /**
     * query the given path
     * @param path
     * @param page
     * @param perPage
     * @returns {Promise}
     */
    get(path, page = 1, perPage = this._perPage) {
        path += (path.includes('?') ? '&' : '?') + `page=${page}&per_page=${perPage}`;

        return GitlabClient.throttle(async () => {
            const response = await fetch(`${this.url}${path}`, {
                headers: {
                    'PRIVATE-TOKEN': this.token
                }
            });

            await GitlabClient.assertOk(response, 'GET', path);
            GitlabClient.assertJson(response, 'GET', path);

            return { body: await response.json(), headers: response.headers };
        });
    }

    /**
     * query the given path and paginate automatically and in parallel
     * through all available pages
     * @param path
     * @param perPage
     * @param runners
     * @returns {Promise}
     */
    async all(path, perPage = this._perPage, runners = this._parallel) {
        const response = await this.get(path, 1, perPage);
        const collect = [...response.body];
        const pages = parseInt(response.headers.get('x-total-pages'));

        if (pages === 1) return collect;

        const tasks = GitlabClient.createGetTasks(path, pages, 2, perPage);
        await this.getParallel(tasks, collect, runners);

        return collect;
    }

    /**
     * make multiple get requests by the given tasks and apply the
     * data to the given set
     * @param tasks
     * @param collect
     * @param runners
     * @returns {Promise}
     */
    getParallel(tasks, collect = [], runners = this._parallel) {
        return parallel(tasks, async task => {
            const response = await this.get(task.path, task.page, task.perPage);
            response.body.forEach(item => collect.push(item));
        }, this.config, runners);
    }

    /**
     * create a task list to get all pages from
     * the given path
     * @param path
     * @param to
     * @param from
     * @param perPage
     * @returns {Array}
     */
    static createGetTasks(path, to, from = 2, perPage) {
        let tasks = [];

        for (let i = from; i <= to; i++) {
            tasks.push({path, perPage, page: i})
        }

        return tasks;
    }
}

export default GitlabClient;
