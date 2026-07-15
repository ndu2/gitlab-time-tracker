import fs from 'fs';
import path from 'path';
import dayjs from '../../core/dayjs.js';
import Hashids from 'hashids';
const hashids = new Hashids();

/** @typedef {import('dayjs').Dayjs} Dayjs */
/** @typedef {import('../../core/file-config.js').default} Config */
/**
 * @typedef {Object} FrameJson
 * @property {string} id
 * @property {string} project
 * @property {{id: string|number, type: string, new?: true}} resource
 * @property {Array<{id: number, time: number}>} notes
 * @property {string|false} start
 * @property {string|false} stop
 * @property {string|false} timezone
 * @property {Dayjs|string} [modified]
 * @property {string|null} [title]
 * @property {string} [note]
 */

class Frame {
    /** @type {string|null} not yet started until startMe()/the start setter runs */
    _start;
    /** @type {string|null} still running until stopMe()/the stop setter runs */
    _stop;
    /** @type {Dayjs|string|undefined} last-write timestamp, set on every write() */
    modified;

    /**
     * constructor.
     * @param {Config} config
     * @param {string|number} id
     * @param {string} type
     * @param {string} [note]
     */
    constructor(config, id, type, note) {
        this.config = config;
        this.project = config.get('project');
        this.resource = {id, type};

        if(typeof id === 'string' || /** @type {any} */ (id) instanceof String)
            this.resource.new = true;

        this.id = Frame.generateId();
        this._start = null;
        this._stop = null;
        this.timezone = config.get('timezone');
        this.notes = [];
        this._note = note;
        this._title = null;
    }

    /**
     * @param {Config} config
     * @param {string} file
     * @returns {Frame}
     */
    static fromFile(config, file) {
        return Frame.fromJson(config, JSON.parse(fs.readFileSync(file, 'utf8')));
    }

    /**
     * @param {Config} config
     * @param {FrameJson} json
     * @returns {Frame}
     */
    static fromJson(config, json) {
        let frame = new this(config, json.resource.id, json.resource.type, json.note);
        frame.project = json.project;
        frame.id = json.id;
        // older frame files persisted the sentinel as `false`; normalize to null
        frame._start = json.start || null;
        frame._stop = json.stop || null;
        frame.notes = json.notes;
        frame.timezone = json.timezone;
        frame.modified = json.modified;
        frame._title = json.title? json.title: null;
        frame.validate();

        return frame;
    }

    validate() {
        if(!this._start || !dayjs(this._start).isValid())
            throw new Error(`Start date is not in a valid ISO date format!`);

        if(this._stop && !dayjs(this._stop).isValid())
            throw new Error(`Stop date is not in a valid ISO date format!`);
    }

    _getCurrentDate() {
        if(this.timezone)
            return dayjs().tz(this.timezone).format();

        return dayjs().format();
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
     * @param {boolean} [skipModified]
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
        // only meaningful once stopped - callers must guard frame.stop === null first
        return dayjs(this.stop).diff(this.start) / 1000;
    }

    get date() {
        return this.start;
    }

    /** @returns {Dayjs} invalid before startMe()/the start setter has run */
    get start() {
        return this.timezone ? dayjs(this._start).tz(this.timezone) : dayjs(this._start);
    }

    /** @param {string|Dayjs} value */
    set start(value) {
        this._start = dayjs.isDayjs(value) ? value.format() : value;
        this.validate();
    }

    /** @returns {Dayjs|null} null while the frame is still running */
    get stop() {
        return this.timezone ? this._stop ? dayjs(this._stop).tz(this.timezone) : null : (this._stop ? dayjs(this._stop) : null);
    }

    /** @param {string|Dayjs|null} value null clears the stop time (still running) */
    set stop(value) {
        this._stop = value ? (dayjs.isDayjs(value) ? value.format() : value) : null;
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

    set note(note) {
        this._note = note;
    }

    get file() {
        return path.join(this.config.frameDir, this.id + '.json');
    }

    /**
     * generate a unique id
     * @returns {string}
     */
    static generateId() {
        return hashids.encode(new Date().getTime());
    }
}

export default Frame;
