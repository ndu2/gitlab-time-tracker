import GitlabClient from './gitlab-client.js';
import parallel from '../parallel.js';

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
    async authorized() {
        if (!this.config.get('_checkToken')) return;

        try {
            await this.client.get('broadcast_messages');
        } catch (e) {
            if (e.statusCode === 403) return;
            throw e;
        }
    }

    /**
     * query and set the group
     * @param fullPath group path, e.g. "group/subgroup"
     * @returns {Promise<void>}
     */
    async getGroup(fullPath = this.config.get('project')) {
        let groups = await this.client.get(`groups`);
        if (groups.body.length === 0) throw 'Group not found';

        let filtered = groups.body.filter(group => group.full_path === fullPath);
        if (filtered.length === 0) throw 'Group not found';
        this.groups = this.groups.concat(filtered);
    }

    /**
     * get sub groups
     * @returns {Promise<void>}
     */
    async getSubGroups() {
        let groups = await this.client.get(`groups`);
        if (groups.body.length === 0) return;

        let filtered = this._filterGroupsByParents(groups.body, this.groups.map(g => g.id));
        if (filtered.length === 0) return;

        this.groups = this.groups.concat(filtered);
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
