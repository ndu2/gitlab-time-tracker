import _ from 'underscore';
import moment from 'moment';
import Fs from '../core/filesystem.js';
import Frame from './storage/frame.js';
import Issue from './api/issue.js';
import MergeRequest from './api/mergeRequest.js';
import FrameCollection from './storage/frameCollection.js';

const classes = {
    issue: Issue,
    merge_request: MergeRequest
};

const CURRENT_FILE = 'current.txt';

class Timekeeper {
    constructor(config) {
        this.config = config;
        this.sync = {};
    }

    /**
     * Path to the pointer file that names the currently
     * active (not yet stopped) frame, if any.
     */
    _currentFile() {
        return Fs.join(this.config.frameDir, CURRENT_FILE);
    }

    /**
     * id of the currently active frame, or null if none is running.
     * Only one frame can be active at a time, so this is a direct
     * lookup instead of scanning every frame file.
     */
    _currentId() {
        if (!Fs.exists(this._currentFile())) return null;

        let id = Fs.readText(this._currentFile()).trim();

        return id || null;
    }

    /**
     * Filter frames that need an update
     * @returns {Promise}
     */
    async syncInit() {
        this.sync.frames = new FrameCollection(this.config);

        // filter out frames, that don't need an update
        this.sync.frames.filter(frame => !(Math.ceil(frame.duration) === _.reduce(frame.notes, (n, m) => (n + m.time), 0)));
    }

    /**
     * Resolve merge_requests and issues
     * respectively.
     * @returns {Promise}
     */
    syncResolve(callback) {
        this.sync.resources = {}

        // resolve issues and merge requests
        return this.sync.frames.forEach(async (frame, done) => {
            let project = frame.project,
                type = frame.resource.type,
                id = frame.resource.id;
            if(!(project in this.sync.resources))
            {
                this.sync.resources[project]=
                {
                    issue: {},
                    merge_request: {}
                };
            }

            if(id in this.sync.resources[project][type]) {
                return done();
            }
            this.sync.resources[project][type][id] = new classes[type](this.config, {});

            try {
                await this.sync.resources[project][type][id].make(project, id, frame.resource.new);
                if (callback) callback();
                done();
            } catch (error) {
                done(`Could not resolve ${type} ${id} on "${project}"`);
            }
        })
    }

    /**
     * sync details to frames.
     */
     syncDetails(callback) {
        return this.sync.frames.forEach((frame, done) => {
            let project = frame.project,
                type = frame.resource.type,
                id = frame.resource.id;

            if(id in this.sync.resources[project][type]) {
                frame.title = this.sync.resources[project][type][id].data.title;
            }
            return done();
        });
    }

    syncUpdate(callback) {
        return this.sync.frames.forEach(async (frame, done) => {
            let time = frame.duration,
                project = frame.project,
                type = frame.resource.type,
                id = frame.resource.id;

            if (frame.notes.length > 0)
                time = Math.ceil(frame.duration) - parseInt(_.reduce(frame.notes, (n, m) => (n + m.time), 0));

            try {
                await this._addTime(frame, time);
                if (callback) callback();
                done();
            } catch (error) {
                done(`Could not update ${type} ${id} on ${project}`);
            }
        });
    }

    async _addTime(frame, time) {
        let resource = this.sync.resources[frame.project][frame.resource.type][frame.resource.id];

        await resource.createTime(Math.ceil(time), frame._stop, frame.note);
        await resource.getNotes();

        if (frame.resource.new) {
            delete frame.resource.new;
            frame.resource.title = frame.resource.id;
            frame.resource.id = resource.data.iid;
        }

        frame.notes.push({
            id: resource.notes[0].id,
            time: Math.ceil(time)
        });

        frame.write(true);
    }

    /**
     *
     * @returns {Promise}
     */
    async status() {
        let id = this._currentId();

        if (!id) return [];

        return [Frame.fromFile(this.config, Fs.join(this.config.frameDir, id + '.json'))];
    }

    /**
     *
     * @returns {Promise}
     */
    async log() {
        let frames = {},
            times = {};

        await new FrameCollection(this.config)
            .forEach((frame, done) => {
                if (frame.stop === false) return done();
                let date = frame.date.format('YYYY-MM-DD');

                if (!frames[date]) frames[date] = [];
                if (!times[date]) times[date] = 0;

                frames[date].push(frame);
                times[date] += Math.ceil(frame.duration);

                done();
            });

        return {frames, times};
    }

    /**
     *
     * @returns {Promise}
     */
    async all() {
        let frames = [];

        await new FrameCollection(this.config)
            .forEach((frame, done) => {
                frames.push(frame);
                done();
            });

        return {frames};
    }

    /**
     *
     * @returns {Promise}
     */
    async resume(frame) {
        if (!frame) {
            throw "No task found to resume.";
        }

        return this.start(frame.project, frame.resource.type, frame.resource.id, frame.note);
    }

    list(project, type, state, my) {
        this.config.set('project', project);
        return classes[type].list(this.config, this.config.get('project'), state, my);
    }

    /**
     *
     * @param project
     * @param type
     * @param id
     * @returns {Promise}
     */
    async start(project, type, id, note) {
        this.config.set('project', project);

        if (this._currentId())
            throw "Already running. Please stop it first with 'gtt stop'.";

        let frame = new Frame(this.config, id, type, note).startMe();
        Fs.writeText(this._currentFile(), frame.id);

        return frame;
    }

    /**
     *
     * @returns {Promise}
     */
    async stop() {
        let id = this._currentId();

        if (!id) throw 'No projects started.';

        let frame = Frame.fromFile(this.config, Fs.join(this.config.frameDir, id + '.json')).stopMe();
        Fs.remove(this._currentFile());

        return [frame];
    }

    /**
     *
     * @returns {Promise}
     */
    async cancel() {
        let id = this._currentId();

        if (!id) throw 'No projects started.';

        let file = Fs.join(this.config.frameDir, id + '.json');
        let frame = Frame.fromFile(this.config, file);
        Fs.remove(file);
        Fs.remove(this._currentFile());

        return [frame];
    }
}

export default Timekeeper;
