import CoreTask from '../../core/task.js';
import GitlabClient from '../../core/gitlab-client.js';
import writable from './writable.js';

/**
 * issue with timekeeping write operations (make/createTime via the writable
 * mixin). The collection-level list() query is a static — it needs no
 * instance state.
 */
class issue extends writable(CoreTask) {
    constructor(config, data, client) {
        super(config, data, client, 'issues');
    }

    /**
     * list issues, either of a single project or across all projects
     * @returns {Promise} resolving to an array of issue instances
     */
    static list(config, project, state, my, client = new GitlabClient(config)) {
        const query = `scope=${my ? "assigned-to-me" : "all"}&state=${state}`;
        const path = project
            ? `projects/${encodeURIComponent(project)}/issues?${query}`
            : `issues/?${query}`;

        return client.get(path)
            .then(response => response.body.map(data => new this(config, data, client)));
    }
}

export default issue;
