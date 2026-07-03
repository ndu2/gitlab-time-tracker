import _ from 'underscore';
import moment from 'moment';
import resource from './resource.js';

/**
 * issue model — shared data/getters. Write ops (make/list/createTime) live in
 * timekeeping/api/issue.js; read/aggregation in reporting/api/issue.js.
 */
class issue extends resource {
    constructor(config, data = {}) {
        super(config);
        this.data = data;
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
        return 'issues';
    }

    get _typeSingular() {
        return 'Issue';
    }
}

export default issue;
