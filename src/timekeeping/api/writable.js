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
     * create time with notes using graphql.
     *
     * works for issues, tasks, incidents and merge requests (on 19.1.1-ee) to add
     * spent times with the correct date and a comment
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
        const query = 
        `mutation($input: CreateNoteInput!) {
            createNote(input: $input) {
                note {
                id
                body
                }
                errors
            }
        }`
        let noteablePath = (this._type == 'merge_requests') ? 'MergeRequest' : 'WorkItem';
        let request = {
            "query": query,
            "variables": {
                "input": {
                    "noteableId": `gid://gitlab/${noteablePath}/${this.id}`,
                    "body": '/spend '+Time.toHumanReadable(time, this.config.get('hoursPerDay'), '[%sign][%days>d ][%hours>h ][%minutes>m ][%seconds>s]' + ' ' + spentAt + note),
                }
            }
        };
        let promise = this.client.graphQL(request);
        promise.then(response => {
            if(!response.body || response.body.errors) {
                throw new Error(`createTime failed: ${JSON.stringify(response.body)}`);
            }
            return response;
        });
    }
};
