import Time from '../../core/time.js';

/**
 * mixin: adds timekeeping write operations to a core issue/mergeRequest class:
 * make() (get-or-create the resource) and createTime() (post a "/spend" note).
 * The resource path segment is taken from the core class' _type getter.
 * @param Base a core issue/mergeRequest class
 */
export default Base => class extends Base {
    /**
     * get-or-create the resource on GitLab and populate this.data
     * @param project
     * @param id
     * @param create create the resource instead of fetching it
     * @returns {Promise}
     */
    make(project, id, create = false) {
        let promise = create
            ? this.client.post(`projects/${encodeURIComponent(project)}/${this._type}`, {title: id})
            : this.client.get(`projects/${encodeURIComponent(project)}/${this._type}/${id}`);

        return promise.then(response => {
            this.data = response.body;
            return this;
        });
    }

    /**
     * set notes
     * @returns {Promise}
     */
    getNotes() {
        let promise = this.client.all(`projects/${this.data.project_id}/${this._type}/${this.iid}/notes`);
        promise.then(notes => this.notes = notes);

        return promise;
    }

    /**
     * create time
     * @param time
     * @returns {*}
     */
    createTime(time, created_at, note) {
        if(note === null || note === undefined) {
            note = '';
        }
        else {
            note = '\n\n' + note;
        }
        var date = new Date(created_at);
        var spentAt = date.getUTCFullYear()+"-"+(date.getUTCMonth()+1)+"-"+date.getUTCDate();
        return this.client.post(`projects/${this.data.project_id}/${this._type}/${this.iid}/notes`, {
            body: '/spend '+Time.toHumanReadable(time, this.config.get('hoursPerDay'), '[%sign][%days>d ][%hours>h ][%minutes>m ][%seconds>s]'+' '+spentAt + note),
        });
    }
};
