import GitlabClient from './gitlab-client.js';
import parallel from './parallel.js';

/**
 * owner model
 */
class Owner {
    constructor(config, client = new GitlabClient(config)) {
        this.config = config;
        this.client = client;
        this.projects = [];
        this.groups = [];
        this.users = [];
    }

    /**
     * is authorized?
     * @returns {Promise<void>}
     */
    authorized() {
        if (!this.config.get('_checkToken')) return new Promise(r => r());

        return new Promise((resolve, reject) => {
            this.client.get('broadcast_messages')
                .then(() => resolve())
                .catch(e => {
                    if (e.statusCode === 403) resolve();
                    reject(e);
                });
        });
    }

    /**
     * query and set the group
     * @param fullPath group path, e.g. "group/subgroup"
     * @returns {Promise<void>}
     */
    getGroup(fullPath = this.config.get('project')) {
        return new Promise((resolve, reject) => {
            this.client.get(`groups`)
                .then(groups => {
                    if (groups.body.length === 0) return reject('Group not found');
                    groups = groups.body;

                    let filtered = groups.filter(group => group.full_path === fullPath);
                    if (filtered.length === 0) return reject('Group not found');
                    this.groups = this.groups.concat(filtered);
                    resolve();
                })
                .catch(e => reject(e));
        });
    }

    /**
     * get sub groups
     * @returns {Promise<void>}
     */
    getSubGroups() {
        return new Promise((resolve, reject) => {
            this.client.get(`groups`)
                .then(groups => {
                    if (groups.body.length === 0) return resolve();

                    let filtered = this._filterGroupsByParents(groups.body, this.groups.map(g => g.id));
                    if (filtered.length === 0) return resolve();

                    this.groups = this.groups.concat(filtered);
                    resolve();
                })
                .catch(e => reject(e));
        });
    }

    _filterGroupsByParents(groups, parents) {
        let filtered = groups.filter(group => {
            return parents.indexOf(group.parent_id) !== -1;
        });

        if (filtered.length !== 0) {
            filtered = filtered.concat(this._filterGroupsByParents(groups, filtered.map(g => g.id)));
        }

        return filtered;
    }

    // /**
    //  * query and set the user
    //  * @returns {Promise}
    //  */
    // getUser() {
    //     return new Promise((resolve, reject) => {
    //         this.get(`users/?username=${encodeURIComponent(this.config.get('project'))}`)
    //             .then(user => {
    //                 if (user.body.length === 0) return reject();
    //                 let filtered = user.body.filter(u => u.username === this.config.get('project'));
    //                 if (filtered.length === 0) return reject();
    //                 this.user = filtered[0];
    //                 resolve();
    //             })
    //             .catch(e => reject(e));
    //     });
    // }
    //
    // /**
    //  * query and set the projects by a user
    //  * @returns {Promise}
    //  */
    // getProjectsByUser() {
    //     return new Promise((resolve, reject) => {
    //         this.get(`users/${this.user.id}/projects`)
    //             .then(projects => {
    //                 this.projects = this.projects.concat(projects.body);
    //                 resolve();
    //             })
    //             .catch(e => reject(e));
    //     });
    // }

    /**
     * query and set the projects by a user
     * @returns {Promise}
     */
    getProjectsByGroup() {
        return parallel(this.groups, async group => {
            this.projects = await this.client.all(`groups/${group.id}/projects`);
        }, this.config);
    }
}

export default Owner;
