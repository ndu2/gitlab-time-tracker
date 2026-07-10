import CoreTask from './task.js';
import GitlabClient from './gitlab-client.js';

class Issue extends CoreTask {
    static resoureType = 'issues';

    constructor(config, data, client, project_namespace) {
        super(config, data, client, Issue.resoureType, project_namespace);
    }

    static list(config, project, state, my, client = new GitlabClient(config)) {
        const query = `scope=${my ? "assigned-to-me" : "all"}&state=${state}`;
        const path = project
            ? `projects/${encodeURIComponent(project)}/${Issue.resoureType}?${query}`
            : `${Issue.resoureType}/?${query}`;

        return client.get(path)
            .then(response => response.body.map(data => new this(config, data, client)));
    }
}

export default Issue;
