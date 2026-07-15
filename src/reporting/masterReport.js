import parallel from '../core/parallel.js';
import Issue from '../core/api/issue.js';
import MergeRequest from '../core/api/mergeRequest.js';
import {timelogsFor} from './api/timelogs.js';

/**
 * aggregates ProjectReports and processes their issues/merge requests
 */
class MasterReport {
    /**
     * constructor.
     * @param config
     */
    constructor(config, client) {
        this.config = config;
        this.client = client;
        this.projects = {};
        this.issues = [];
        this.mergeRequests = [];
        this.timelogs = [];
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
     * process the given input
     * @param input
     * @param model
     * @param {(() => void)|false} [advance]
     * @returns {Promise<void>}
     */
    async process(input, model, advance = false) {
        let collect = [];

        await parallel(this[input], async data => {
            let item = new model(this.config, data, this.client, this.projects[data.project_id]);

            item.recordTimelogs(timelogsFor(this.timelogs, input, data));

            if (this.config.get('showWithoutTimes') || item.times.length > 0) {
                collect.push(item);
            }

            if (advance) advance();
        }, this.config);

        this[input] = this.filter(collect);
    }

    /**
     * merge a project report into this report
     * @param {import('./api/projectReport.js').default} report
     */
    merge(report) {
        this.issues = this.issues.concat(report.issues);
        this.mergeRequests = this.mergeRequests.concat(report.mergeRequests);
        this.projects[report.project.id] = report.project;
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

export default MasterReport;
