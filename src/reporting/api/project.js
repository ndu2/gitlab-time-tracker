import GitlabClient from '../../core/gitlab-client.js';

/**
 * project model
 */
class Project {
    /**
     * construct
     * @param config
     * @param data
     * @param client
     */
    constructor(config, data, client = new GitlabClient(config)) {
        this.config = config;
        this.client = client;
        this.data = data;
        this.projectMembers = data.members ? data.members : [];
    }

    /**
     * make
     * @param name
     */
    make(name) {
        let promise = this.client.get(`projects/${encodeURIComponent(name)}`);
        promise.then(project => this.data = project.body);

        return promise;
    }

    /**
     * set members
     * @returns {Promise<void>}
     */
    members() {
        return new Promise((resolve, reject) => {
            this.client.get(`projects/${this.id}/members`)
                .then(response => {
                    this.projectMembers = this.projectMembers.concat(response.body);
                    return Promise.resolve();
                })
                .then(() => {
                    if (!this.data.namespace || !this.data.namespace.kind || this.data.namespace.kind !== "group") return resolve();

                    this.client.get(`groups/${this.data.namespace.id}/members`)
                        .then(response => {
                            this.projectMembers = this.projectMembers.concat(response.body);
                            resolve();
                        })
                        .catch(e => reject(e));
                })
                .catch(e => reject(e));
        });
    }

    /*
     * properties
     */
    get id() {
        return this.data.id;
    }

    get name() {
        return this.data.path_with_namespace;
    }

    get users() {
        return this.projectMembers.map(member => member.username);
    }
}

export default Project;