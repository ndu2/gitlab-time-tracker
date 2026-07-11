import GitlabClient from '../../core/gitlab-client.js';

/**
 * project model
 */
class Project {
    /**
     * construct
     * @param {import('../../core/config.js').default} config
     * @param data
     * @param {GitlabClient} client
     */
    constructor(config, data, client = new GitlabClient(config)) {
        this.config = config;
        this.client = client;
        this.data = data;
        this.projectMembers = data.members ? data.members : [];
    }

    /**
     * make
     * @param {import('../../core/config.js').default} config
     * @param {GitlabClient} client
     * @param {string} name
     */
    static async create(config, name, client) {
        let data = await client.get(`projects/${encodeURIComponent(name)}`);
        return new Project(config, data.body, client);
    }

    /**
     * set members
     * @returns {Promise<void>}
     */
    async members() {
        let response = await this.client.get(`projects/${this.id}/members`);
        this.projectMembers = this.projectMembers.concat(response.body);

        if (!this.data.namespace || !this.data.namespace.kind || this.data.namespace.kind !== "group") return;

        let groupResponse = await this.client.get(`groups/${this.data.namespace.id}/members`);
        this.projectMembers = this.projectMembers.concat(groupResponse.body);
    }

    /*
     * properties
     */
    get id() {
        return this.data.id;
    }

    get namespace() {
        return this.data.path_with_namespace;
    }

    get name() {
        return this.data.name;
    }

    get users() {
        return this.projectMembers.map(member => member.username);
    }
}

export default Project;