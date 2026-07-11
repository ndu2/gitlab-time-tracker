import GitlabClient from '../../core/gitlab-client.js';
import Project from './project.js';
import fetchTimelogs from './timelogs.js';
import {excludeByLabel, excludeMoved} from './filters.js';
import Config from '../../core/config.js';

/**
 * fetches issues, merge requests and timelogs for a single project
 */
class ProjectReport {
    /**
     * constructor.
     * @param {Config} config
     * @param {Project} project
     * @param {GitlabClient} client
     */
    constructor(config, project, client = new GitlabClient(config)) {
        this.config = config;
        this.client = client;
        this.project = project;

        this.issues = [];
        this.mergeRequests = [];

        this.timelogs = null;
    }

    /**
     * get params for querying issues and merge requests
     * @returns {string}
     */
    params() {
        let params = [];

        if (this.config.get('iids') && this.config.get('query').length === 1) {
            params.push(`iids=${this.config.get('iids').join(',')}`)
        }

        if (!this.config.get('closed')) {
            params.push(`state=opened`);
        }

        if (this.config.get('includeByLabels')) {
            params.push(`labels=${this.config.get('includeByLabels').join(',')}`);
        }

        if (this.config.get('milestone')) {
            params.push(`milestone=${this.config.get('milestone')}`);
        }

        return `?${params.join('&')}`;
    }

    /**
     * query and set merge requests
     * @returns {Promise}
     */
    getMergeRequests() {
        let promise = this.client.all(`projects/${this.project.id}/merge_requests${this.params()}`);
        let excludes = this.config.get('excludeByLabels');
        promise.then(mergeRequests => this.mergeRequests = excludeByLabel(mergeRequests, excludes));

        return promise;
    }

    /**
     * query and set issues
     * @returns {Promise}
     */
    getIssues() {
        let promise = this.client.all(`projects/${this.project.id}/issues${this.params()}`);
        let excludes = this.config.get('excludeByLabels');
        promise.then(issues => this.issues = excludeByLabel(excludeMoved(issues), excludes));

        return promise;
    }

    /**
     * fetch every timelog for this project in the configured date range.
     * @returns {Promise<Array>}
     */
    async getTimelogs() {
        this.timelogs = await fetchTimelogs(this.client, this.project.data.path_with_namespace, this.config.get('from'), this.config.get('to'));

        return this.timelogs;
    }
}

export default ProjectReport;
