import _ from 'underscore';
import moment from 'moment';
import GitlabClient from './gitlab-client.js';

/**
 * task model — shared data/getters for issues and merge requests, which differ
 * only by their GitLab resource type. Write ops (make/createTime) and the
 * list() query live in timekeeping/api/*; read/aggregation in reporting/api/*.
 * @param type the GitLab resource type: 'issues' or 'merge_requests'
 */
class task {
    constructor(config, data = {}, client = new GitlabClient(config), type) {
        this.config = config;
        this.client = client;
        this.times = [];
        this.days = {};
        this.data = data;
        this.type = type;
    }

    /*
     * properties
     */
    get iid() {
        return this.data.iid;
    }

    get id() {
        return this.data.id;
    }

    get title() {
        return this.data.title;
    }

    get project_id() {
        return this.data.project_id;
    }

    get description() {
        return this.data.description;
    }

    get labels() {
        let labels = _.difference(this.data.labels, this.config.get('excludeLabels'));
        let include = this.config.get('includeLabels');
        return include.length > 0 ? _.intersection(labels, include) : labels;
    }

    get milestone() {
        return this.data.milestone ? this.data.milestone.title : null;
    }

    get assignee() {
        return this.data.assignee ? this.data.assignee.username : null;
    }

    get author() {
        return this.data.author.username;
    }

    get closed() {
        return this.data.state === 'closed';
    }

    get updated_at() {
        return moment(this.data.updated_at);
    }

    get created_at() {
        return moment(this.data.created_at);
    }

    get state() {
        return this.data.state;
    }

    get spent() {
        return this.config.toHumanReadable(this.timeSpent, this._type);
    }

    get due_date() {
        return this.data.due_date ? moment(this.data.due_date): null;
    }

    get total_spent() {
        return this.stats ? this.config.toHumanReadable(this.stats.total_time_spent, this._type) : null;
    }

    get total_estimate() {
        return this.stats ? this.config.toHumanReadable(this.stats.time_estimate, this._type) : null;
    }

    get _type() {
        return this.type;
    }

    get _typeSingular() {
        return this.type === 'merge_requests' ? 'Merge Request' : 'Issue';
    }
}

export default task;
