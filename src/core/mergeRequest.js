import CoreTask from './task.js';
import GitlabClient from './gitlab-client.js';

class MergeRequest extends CoreTask {
    static resoureType = 'merge_requests';
    
    constructor(config, data, client) {
        super(config, data, client, MergeRequest.resoureType);
    }

    static list(config, project, state, my, client = new GitlabClient(config)) {
        const query = `scope=${my ? "assigned-to-me" : "all"}&state=${state}`;
        const path = project
            ? `projects/${encodeURIComponent(project)}/${MergeRequest.resoureType}?${query}`
            : `${MergeRequest.resoureType}}/?${query}`;

        return client.get(path)
            .then(response => response.body.map(data => new this(config, data, client)));
    }
}

export default MergeRequest;
