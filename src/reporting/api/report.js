import dayjs from '../../core/dayjs.js';
import GitlabClient from '../../core/gitlab-client.js';
import parallel from '../../core/parallel.js';
import Issue from '../../core/issue.js';
import MergeRequest from '../../core/mergeRequest.js';
import Project from './project.js';
import fetchTimelogs, {timelogsFor} from './timelogs.js';
import {excludeByLabel, excludeMoved} from './filters.js';

/**
 * report model
 */
class Report {
    /**
     * constructor.
     * @param config
     * @param project
     */
    constructor(config, project, client = new GitlabClient(config)) {
        this.config = config;
        this.client = client;

        this.projects = {};
        this.setProject(project);

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
     * set the project by the given data
     * @param project
     */
    setProject(project) {
        if (!project) return;

        this.projects[project.id] = project.path_with_namespace;
        this.project = new Project(this.config, project, this.client)
    }

    /**
     * query and set the project
     * @param namespace project path, e.g. "group/project"
     * @returns {Promise}
     */
    getProject(namespace = this.config.get('project')) {
        let promise = this.client.get(`projects/${encodeURIComponent(namespace)}`);
        promise.then(project => this.setProject(project.body));

        return promise;
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
     * filter empty
     * @param issues
     * @returns {Array}
     */
    filter(issues) {
        return issues.filter(issue => this.config.get('showWithoutTimes') || (issue.times && issue.times.length > 0));
    }

    /**
     * fetch every timelog for this project in the configured date range.
     * @returns {Promise<Array>}
     */
    async getTimelogs() {
        this.timelogs = await fetchTimelogs(this.client, this.project.data.path_with_namespace, this.config.get('from'), this.config.get('to'));

        return this.timelogs;
    }

    /**
     * process the given input
     * @param input
     * @param model
     * @param {(() => void)|false} [advance]
     * @returns {*|Promise}
     */
    process(input, model, advance = false) {
        let collect = [];

        let promise = parallel(this[input], async data => {
            let item = new model(this.config, data, this.client, this.projects[data.project_id]);

            item.recordTimelogs(timelogsFor(this.timelogs, input, data));

            if (this.config.get('showWithoutTimes') || item.times.length > 0) {
                collect.push(item);
            }

            if (advance) advance();
        }, this.config);

        promise.then(() => this[input] = this.filter(collect));
        return promise;
    }

    /**
     * merge another report into this report
     * @param report
     */
    merge(report) {
        this.issues = this.issues.concat(report.issues);
        this.mergeRequests = this.mergeRequests.concat(report.mergeRequests);
        if (!this.members) this.members = [];
        this.members = this.members.concat(report.members ? report.members : []);
        this.projects = Object.assign(this.projects, report.projects);
        if (!this.timelogs) this.timelogs = [];
        this.timelogs = this.timelogs.concat(report.timelogs);
    }

    /**
     * process issues
     * @param {(() => void)|false} [advance]
     * @returns {Promise}
     */
    processIssues(advance = false) {
        return this.process('issues', Issue, advance);
    }

    /**
     * process merge requests
     * @param {(() => void)|false} [advance]
     * @return {Promise}
     */
    processMergeRequests(advance = false) {
        return this.process('mergeRequests', MergeRequest, advance);
    }
}

export default Report;