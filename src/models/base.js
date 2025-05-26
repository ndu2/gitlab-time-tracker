import async from 'async';
import crypto from 'crypto';
import throttleFactory from 'throttled-queue';

/**
 * base model
 */
class base {
    static throttle;
    
    static init(config) {
        if(base.throttle == undefined){
            base.throttle = throttleFactory(config.data.throttleMaxRequestsPerInterval, config.data.throttleInterval);
        }
    }


    /**
     * construct
     * @param config
     */
    constructor(config) {
        base.init(config);
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
     * @returns {*}
     */
    post(path, data) {

        data.private_token = this.token;


        return new Promise((resolve, reject) => base.throttle(() => {
            fetch(`${this.url}${path}`, {
                method: 'POST',
                headers: {
                    'PRIVATE-TOKEN': this.token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }).then(response => {
                if(!response.ok) {
                    reject(`Error: response not OK`);
                }
                const isJson = response.headers.get("content-type").startsWith('application/json');
                return (Promise.all([isJson ? response.json(): Promise.resolve(undefined), Promise.resolve(response.headers)]));
            }).then(response => {
                resolve({body: response[0], headers: response[1]});
            }).catch(e => reject(e));
        }));
    }


    /**
     * query the given path
     * @param path
     * @param data
     * @returns {*}
     */
     graphQL(data) {
        // remove v4/ from url, add graphql
        const path = this.url.substr(0, this.url.length-3) + 'graphql';
        
        return new Promise((resolve, reject) => base.throttle(() => {
            fetch(`${path}`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer '+this.token, 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }).then(response => {
                if(!response.ok) {
                    reject(`Error: response not OK`);
                }
                if(!response.headers.get("content-type").startsWith('application/json')) {
                    reject(`Error: response not application/json`);
                }
                return (Promise.all([response.json(), Promise.resolve(response.headers)]));
            }).then(response => {
                resolve({body: response[0], headers: response[1]});
            }).catch(e => reject(e));
        }));
    }


    /**
     * query the given path
     * @param path
     * @param page
     * @param perPage
     * @returns {Promise}
     */
    get(path, page = 1, perPage = this._perPage) {

        path += (path.includes('?') ? '&' : '?') + `private_token=${this.token}`;
        path += `&page=${page}&per_page=${perPage}`;

        return new Promise((resolve, reject) => base.throttle(() => {
            fetch(`${this.url}${path}`, {
                headers: {
                    'PRIVATE-TOKEN': this.token
                }
            }).then(response => {
                if(!response.ok) {
                    reject(`Error: response not OK`);
                }
                if(!response.headers.get("content-type").startsWith('application/json')) {
                    reject(`Error: response not application/json`);
                }
                return (Promise.all([response.json(), Promise.resolve(response.headers)]));
            }).then(response => {
                resolve({body: response[0], headers: response[1]});
            }).catch(e => reject(e));
        }));
    }

    /**
     * query the given path and paginate automatically and in parallel
     * through all available pages
     * @param path
     * @param perPage
     * @param runners
     * @returns {Promise}
     */
    all(path, perPage = this._perPage, runners = this._parallel) {
        return new Promise((resolve, reject) => {
            let collect = [];

            this.get(path, 1, perPage).then((response) => {
                response.body.forEach(item => collect.push(item));
                let pages = parseInt(response.headers.get('x-total-pages'));

                if (pages === 1) return resolve(collect);

                let tasks = base.createGetTasks(path, pages, 2, perPage);
                this.getParallel(tasks, collect, runners).then(() => {
                    resolve(collect);
                }).catch(error => reject(error));
            }).catch(err => reject(err));
        });
    }

    /**
     * perform the given worker function on the given tasks in parallel
     * @param tasks
     * @param worker
     * @param runners
     * @returns {Promise}
     */
    parallel(tasks, worker, runners = this._parallel) {
        return new Promise((resolve, reject) => {
            async.eachLimit(Array.from(tasks), runners, worker, error => {
                if (error) return reject(error);
                resolve();
            });
        });
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
        return this.parallel(tasks, (task, done) => {
            this.get(task.path, task.page, task.perPage).then((response) => {
                response.body.forEach(item => collect.push(item));
                done();
            }).catch(error => done(error));
        }, runners);
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
    static createGetTasks(path, to, from = 2, perPage = this._perPage) {
        let tasks = [];

        for (let i = from; i <= to; i++) {
            tasks.push({path, perPage, page: i})
        }

        return tasks;
    }
}

export default base;
