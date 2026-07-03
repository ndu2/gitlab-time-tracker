import fs from 'fs';
import path from 'path';
import dayjs from '../../core/dayjs.js';
import Hashids from 'hashids';
const hashids = new Hashids();

class Frame {
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

        this.id = Frame.generateId();
        this._start = false;
        this._stop = false;
        this.timezone = config.get('timezone');
        this.notes = [];
        this._note = note;
        this._title = null;
    }

    static fromFile(config, file) {
        return Frame.fromJson(config, JSON.parse(fs.readFileSync(file)));
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
        if(!dayjs(this._start).isValid())
            throw new Error(`Start date is not in a valid ISO date format!`);

        if(this._stop && !dayjs(this._stop).isValid())
            throw new Error(`Stop date is not in a valid ISO date format!`);
    }

    _getCurrentDate() {
        if(this.timezone)
            return dayjs().tz(this.timezone).format();

        return dayjs();
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
     * write data to file atomically: write to a temp file in the same
     * directory, then rename over the target so a crash can never leave
     * a partially written or missing frame behind.
     */
    write(skipModified) {
        const tmpFile = `${this.file}.tmp`;

        fs.writeFileSync(tmpFile, JSON.stringify({
            id: this.id,
            project: this.project,
            resource: this.resource,
            notes: this.notes,
            start: this._start,
            stop: this._stop,
            timezone: this.timezone,
            modified: skipModified ? this.modified : dayjs(),
            title: this._title,
            note: this._note
        }, null, "\t"));
        fs.renameSync(tmpFile, this.file);
    }

    get duration() {
        return dayjs(this.stop).diff(this.start) / 1000;
    }

    get date() {
        return this.start;
    }

    get start() {
        return this.timezone ? dayjs(this._start).tz(this.timezone) : dayjs(this._start);
    }

    set start(value) {
        this._start = dayjs.isDayjs(value) ? value.format() : value;
        this.validate();
    }

    get stop() {
        return this.timezone ? this._stop ? dayjs(this._stop).tz(this.timezone) : false : (this._stop ? dayjs(this._stop) : false );
    }

    set stop(value) {
        this._stop = value ? (dayjs.isDayjs(value) ? value.format() : value) : false;
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

export default Frame;
