import Config from '../include/config.js';
import moment from 'moment-timezone';
import Hashids from 'hashids';
const hashids = new Hashids();

class baseFrame {
    /**
     * constructor.
     * @param config
     * @param id
     * @param type
     * @param note
     */
    constructor(config, id, type, note) {
        this.config = config;
        this.project = config.get('project');
        this.resource = {id, type};

        if(typeof id === 'string' || id instanceof String)
            this.resource.new = true;

        this.id = baseFrame.generateId();
        this._start = false;
        this._stop = false;
        this.timezone = config.get('timezone');
        this.notes = [];
        this._note = note;
        this._title = null;
    }

    static fromJson(config, json) {
        let frame = new this(config, json.resource.id, json.resource.type, json.note);
        frame.project = json.project;
        frame.id = json.id;
        frame._start = json.start;
        frame._stop = json.stop;
        frame.notes = json.notes;
        frame.timezone = json.timezone;
        frame.modified = json.modified;
        frame._title = json.title? json.title: null;
        frame.validate();

        return frame;
    }

    validate() {
        moment.suppressDeprecationWarnings = true;

        if(!moment(this._start).isValid())
            throw `Error: Start date is not in a valid ISO date format!`;

        if(this._stop && !moment(this._stop).isValid())
            throw `Error: Stop date is not in a valid ISO date format!`;

        moment.suppressDeprecationWarnings = false;
    }

    _getCurrentDate() {
        if(this.timezone)
            return moment().tz(this.timezone).format();

        return moment();
    }

    static copy(frame) {
        return this.fromJson(Object.assign(new Config, frame.config), {
            id: frame.id,
            project: frame.project,
            resource: frame.resource,
            notes: frame.notes,
            start: frame._start,
            stop: frame._stop,
            timezone: frame.timezone,
            modified: frame.modified,
            title: frame._title,
            note: frame._note,
        });
    }

    get duration() {
        return moment(this.stop).diff(this.start) / 1000;
    }

    get date() {
        return this.start;
    }

    get start() {
        return this.timezone ? moment(this._start).tz(this.timezone) : moment(this._start);
    }

    get stop() {
        return this.timezone ? this._stop ? moment(this._stop).tz(this.timezone) : false : (this._stop ? moment(this._stop) : false );
    }

    set title(title) {
        this._title = title;
    }

    get title() {
        return this._title;
    }

    get note() {
        return this._note;
    }

    /**
     * generate a unique id
     * @returns {number}
     */
    static generateId() {
        return hashids.encode(new Date().getTime());
    }
}

export default baseFrame;
