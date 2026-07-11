import dayjs from './dayjs.js';
import GitlabClient from './gitlab-client.js';
import Time from './time.js';
import chargeRatio from './billing.js';

class Task {
    /**
     * @param config
     * @param data
     * @param client
     * @param type
     * @param {string} [project_namespace] the owning project's path_with_namespace, if known
     */
    constructor(config, data = {}, client = new GitlabClient(config), type, project_namespace) {
        this.config = config;
        this.client = client;
        this.times = [];
        this.data = data;
        this.type = type;
        this.project_namespace = project_namespace;
    }

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
        let excludeLabels = this.config.get('excludeLabels');
        let labels = Array.isArray(excludeLabels)
            ? (this.data.labels || []).filter(label => !excludeLabels.includes(label))
            : (this.data.labels || []);
        let include = this.config.get('includeLabels');
        return include.length > 0 ? labels.filter(label => include.includes(label)) : labels;
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
        return dayjs(this.data.updated_at);
    }

    get created_at() {
        return dayjs(this.data.created_at);
    }

    get state() {
        return this.data.state;
    }

    get spent() {
        return this.config.toHumanReadable(this.timeSpent, this._type);
    }

    get due_date() {
        return this.data.due_date ? dayjs(this.data.due_date): null;
    }

    get total_spent() {
        return this.data.time_stats ? this.config.toHumanReadable(this.data.time_stats.total_time_spent, this._type) : null;
    }

    get total_spent_s() {
        return this.data.time_stats ? this.data.time_stats.total_time_spent : 0;
    }

    get total_estimate() {
        return this.data.time_stats ? this.config.toHumanReadable(this.data.time_stats.time_estimate, this._type) : null;
    }

    get total_estimate_s() {
        return this.data.time_stats ? this.data.time_stats.time_estimate : 0;
    }

    get _type() {
        return this.type;
    }

    get _typeSingular() {
        return this.type === 'merge_requests' ? 'Merge Request' : 'Issue';
    }

    make(project, id, create = false) {
        let promise = create
            ? this.client.post(`projects/${encodeURIComponent(project)}/${this._type}`, {title: id})
            : this.client.get(`projects/${encodeURIComponent(project)}/${this._type}/${id}`);

        return promise.then(response => {
            this.data = response.body;
            return this;
        });
    }

    getNotes() {
        let promise = this.client.all(`projects/${this.data.project_id}/${this._type}/${this.iid}/notes`);
        promise.then(notes => this.notes = notes);

        return promise;
    }

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
        return this.client.graphQL(request).then(response => {
            let errors = response.body?.errors ?? response.body?.data?.createNote?.errors;
            if(!response.body || (errors && errors.length)) {
                throw new Error(`createTime failed: ${JSON.stringify(response.body)}`);
            }
            return response.body.data.createNote.note;
        });
    }

    recordTimelogs(timelogs){
        let ratio = chargeRatio(this.labels, this.config);

        let times = [],
            timeSpent = 0,
            timeUsers = {},
            timeFormat = this.config.get('timeFormat', this._type);

        timelogs.forEach(
            (timelog) => {
                let spentAt = dayjs(timelog.spentAt);

                let time = new Time(spentAt, {
                    author: {username: timelog.user.username},
                    created_at: timelog.spentAt,
                    noteable_type: this._typeSingular
                }, this, this.config, timelog.timeSpent, timelog.note && timelog.note.body ? timelog.note.body : null, ratio);

                // only include times by the configured user
                if (this.config.get('user') && this.config.get('user') !== timelog.user.username) return;

                if (!timeUsers[timelog.user.username]) timeUsers[timelog.user.username] = 0;

                timeSpent += time.seconds;
                timeUsers[timelog.user.username] += time.seconds;

                times.push(time);
            });

        Object.entries(timeUsers).forEach(([name, time]) => this[`time_${name}`] = Time.toHumanReadable(time, this.config.get('hoursPerDay'), timeFormat));
        this.timeSpent = timeSpent;
        this.times = times;
    }
}

export default Task;
