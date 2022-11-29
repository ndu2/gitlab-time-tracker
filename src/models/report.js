const _ = require('underscore');
const moment = require('moment');

const Base = require('./base');
const Issue = require('./issue');
const MergeRequest = require('./mergeRequest');
const Project = require('./project');

/**
 * report model
 */
class report extends Base {
    /**
     * constructor.
     * @param config
     * @param project
     */
    constructor(config, project) {
        super(config);

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
        this.project = new Project(this.config, project)
    }

    /**
     * query and set the project
     * @returns {Promise}
     */
    getProject() {
        let promise = this.get(`projects/${encodeURIComponent(this.config.get('project'))}`);
        promise.then(project => this.setProject(project.body));

        return promise;
    }

    /**
     * query and set merge requests
     * @returns {Promise}
     */
    getMergeRequests() {
        let promise = this.all(`projects/${this.project.id}/merge_requests${this.params()}`);
        let excludes = this.config.get('excludeByLabels');
        promise.then(mergeRequests => this.mergeRequests = mergeRequests.filter(mr => (
            (!excludes || excludes.filter(l=>mr.labels.includes(l)).length==0) // keep all merge requests not including a exclude label
            )));

        return promise;
    }

    /**
     * query and set issues
     * @returns {Promise}
     */
    getIssues() {
        let promise = this.all(`projects/${this.project.id}/issues${this.params()}`);
        let excludes = this.config.get('excludeByLabels');
        promise.then(issues => this.issues = issues.filter(issue => (
            issue.moved_to_id == null && // filter moved issues in any case
            (!excludes || excludes.filter(l=>issue.labels.includes(l)).length==0) // keep all issues not including a exclude label
            )));
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
     * starts loading the timelogs data page after the cursor into the array timelogs and recurse to the next page as soon as results are received
     * sets this.timelogs when the last page is received.
     * @param {String} cursor 
     * @param {Array} timelogs 
     */
    getTimelogPage(cursor, timelogs) {
        if(!timelogs) {
            timelogs = [];
        }

        const query = `
        query ($project: ID!, $after: String, $entryPerPage: Int,
            $startTime:Time, $endTime:Time){
              project(fullPath: $project) {
                name
                timelogs(startTime: $startTime, endTime: $endTime,
                  first:$entryPerPage, after: $after) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    user {
                      username
                    }
                    spentAt
                    timeSpent
                    summary
                    note {
                      body
                      url
                    }
                    mergeRequests:mergeRequest {
                      iid
                      projectId
                    }
                    issues:issue {
                      iid
                      projectId
                    }
                  }
                }
              }
            }
            `

        let request = {
            "query": query,
            "variables": {
                "project": this.project.data.path_with_namespace,
                "after": (cursor===undefined)?'':cursor,
                "entryPerPage": 30,
                "startTime": this.config.get('from'),
                "endTime": this.config.get('to')
            }
        };

        let promise = this.graphQL(request);
        promise.then(response => {
            if (response.body.errors) {
                this.timelogs = [];
            } else {
                if (response.body.data.project.timelogs.nodes) {
                    // add timelogs
                    timelogs.push(response.body.data.project.timelogs.nodes);
                    if (response.body.data.project.timelogs.pageInfo.hasNextPage) {
                        // get next page
                        this.getTimelogPage(response.body.data.project.timelogs.pageInfo.endCursor, timelogs);
                    }
                    else {
                        // all pages loaded. combine chunks into single array.
                        let timelogsAggr =  [];
                        timelogs.forEach((timelogchunk) => {
                            timelogchunk.forEach((timelog) => {
                                timelogsAggr.push(timelog);
                            });
                        });
                        this.timelogs = timelogsAggr;
                    }
                }
                else {
                    this.timelogs = [];
                }
            }
        }
        );
    }


    waitForTimelogs(resolve) {
        if (this.timelogs == null) {
            setTimeout(this.waitForTimelogs.bind(this), 50, resolve);
        } else {
            resolve();
        }

    }


    getTimelogs() {
        this.getTimelogPage();
        let prm = new Promise((resolve, reject) => {
            this.waitForTimelogs(resolve);
        });
        return prm;
    }

    /**
     * process the given input
     * @param input
     * @param model
     * @param advance
     * @returns {*|Promise}
     */
    process(input, model, advance = false) {
        let collect = [];

        let promise = this.parallel(this[input], (data, done) => {

            let item = new model(this.config, data);
            item.project_namespace = this.projects[item.project_id];

            item.recordTimelogs(this.timelogs.filter(
                timelog => timelog[input] &&
                    timelog[input].iid == data.iid &&
                    timelog[input].projectId == data.project_id));
            
            item.getNotes()
                .then(() => item.getTimes())
                .catch(error => done(error))
                .catch(error => done(error))
                .then(() => item.getStats())
                .catch(error => done(error))
                .then(() => {
                    if (this.config.get('showWithoutTimes') || item.times.length > 0) {
                        collect.push(item);
                    }

                    if (advance) advance();
                    return done();
                });


            // collect items, query times & stats
            collect.push();
        });

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
     * @param advance
     * @returns {Promise}
     */
    processIssues(advance = false) {
        return this.process('issues', Issue, advance);
    }

    /**
     * process merge requests
     * @param advance
     * @return {Promise}
     */
    processMergeRequests(advance = false) {
        return this.process('mergeRequests', MergeRequest, advance);
    }
}

module.exports = report;