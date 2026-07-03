import GitlabClient from './gitlab-client.js';

/**
 * shared base for models that have times (issues, merge requests).
 * Holds only what both timekeeping and reporting need: the notes read.
 * Timekeeping write methods live in timekeeping/api/writable.js,
 * reporting read/aggregation lives in reporting/api/reportable.js.
 */
class resource extends GitlabClient {
    constructor(config) {
        super(config);
        this.times = [];
        this.timesWarnings = [];
        this.days = {};
    }

    /**
     * set notes
     * @returns {Promise}
     */
    getNotes() {
        let promise = this.all(`projects/${this.data.project_id}/${this._type}/${this.iid}/notes`);
        promise.then(notes => this.notes = notes);

        return promise;
    }
}

export default resource;
