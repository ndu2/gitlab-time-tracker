import CoreTask from '../../core/task.js';
import GitlabClient from '../../core/gitlab-client.js';
import writable from './writable.js';

/**
 * merge request with timekeeping write operations (make/createTime) provided
 * by the writable mixin; make() targets merge_requests via the _type getter.
 */
class MergeRequest extends writable(CoreTask) {
    constructor(config, data, client) {
        super(config, data, client, 'merge_requests');
    }

    /**
     * list merge requests, either of a single project or across all projects
     * @returns {Promise} resolving to an array of merge request instances
     */
    static list(config, project, state, my, client = new GitlabClient(config)) {
        const query = `scope=${my ? "assigned-to-me" : "all"}&state=${state}`;
        const path = project
            ? `projects/${encodeURIComponent(project)}/merge_requests?${query}`
            : `merge_requests/?${query}`;

        return client.get(path)
            .then(response => response.body.map(data => new this(config, data, client)));
    }
}

export default MergeRequest;
