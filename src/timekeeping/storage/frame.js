import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import Hashids from 'hashids';
const hashids = new Hashids();

class frame {
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

        this.id = frame.generateId();
        this._start = false;
        this._stop = false;
        this.timezone = config.get('timezone');
        this.notes = [];
        this._note = note;
        this._title = null;
    }

    static fromFile(config, file) {
        return frame.fromJson(config, JSON.parse(fs.readFileSync(file)));
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

    startMe() {
        this._start = this._getCurrentDate();
        this.write();

        return this;
    }

    stopMe() {
        this._stop = this._getCurrentDate();
        this.write();

        return this;
    }

    /**
     * assert file exists
     */
    assertFile() {
        if (!fs.existsSync(this.file)) fs.appendFileSync(this.file, '');
    }

    /**
     * write data to file
     */
    write(skipModified) {
        if (fs.existsSync(this.file)) fs.unlinkSync(this.file);
        fs.appendFileSync(this.file, JSON.stringify({
            id: this.id,
            project: this.project,
            resource: this.resource,
            notes: this.notes,
            start: this._start,
            stop: this._stop,
            timezone: this.timezone,
            modified: skipModified ? this.modified : moment(),
            title: this._title,
            note: this._note
        }, null, "\t"));
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

    set start(value) {
        this._start = moment.isMoment(value) ? value.format() : value;
        this.validate();
    }

    get stop() {
        return this.timezone ? this._stop ? moment(this._stop).tz(this.timezone) : false : (this._stop ? moment(this._stop) : false );
    }

    set stop(value) {
        this._stop = value ? (moment.isMoment(value) ? value.format() : value) : false;
        this.validate();
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

    get file() {
        return path.join(this.config.frameDir, this.id + '.json');
    }

    /**
     * generate a unique id
     * @returns {number}
     */
    static generateId() {
        return hashids.encode(new Date().getTime());
    }
}

export default frame;
