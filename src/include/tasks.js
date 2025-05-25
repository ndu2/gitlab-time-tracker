import _ from 'underscore';
import moment from 'moment';
import Fs from './filesystem.js';
import Frame from './../models/frame.js';
import Issue from './../models/issue.js';
import MergeRequest from './../models/mergeRequest.js';
import FrameCollection from './../models/frameCollection.js';

const classes = {
    issue: Issue,
    merge_request: MergeRequest
};

const stop_condition = {
    term: `"stop" ?: ?false`,
    flags: "i"
};

class tasks {
    constructor(config) {
        this.config = config;
        this.sync = {};
    }

    /**
     * Filter frames that need an update
     * @returns {Promise}
     */
    syncInit() {
        this.sync.frames = new FrameCollection(this.config);

        // filter out frames, that don't need an update
        this.sync.frames.filter(frame => !(Math.ceil(frame.duration) === _.reduce(frame.notes, (n, m) => (n + m.time), 0)));

        return new Promise(r => r());
    }

    /**
     * Resolve merge_requests and issues
     * respectively.
     * @returns {Promise}
     */
    syncResolve(callback) {
        this.sync.resources = {}
        
        // resolve issues and merge requests
        return this.sync.frames.forEach((frame, done) => {
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
            this.sync.resources[project][type][id]
                .make(project, id, frame.resource.new)
                .then(() => {
                    if (callback) callback();
                    done();
                })
                .catch(error => done(`Could not resolve ${type} ${id} on "${project}"`));
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
        return this.sync.frames.forEach((frame, done) => {
            let time = frame.duration,
                project = frame.project,
                type = frame.resource.type,
                id = frame.resource.id;

            if (frame.notes.length > 0)
                time = Math.ceil(frame.duration) - parseInt(_.reduce(frame.notes, (n, m) => (n + m.time), 0));

            this._addTime(frame, time)
                .then(() => {
                    if (callback) callback();
                    done();
                })
                .catch(error => done(`Could not update ${type} ${id} on ${project}`))
        });
    }

    _addTime(frame, time) {
        return new Promise((resolve, reject) => {
            let resource = this.sync.resources[frame.project][frame.resource.type][frame.resource.id];

            resource.createTime(Math.ceil(time), frame._stop, frame.note)
                .then(() => resource.getNotes())
                .then(() => {
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
                    resolve();
                })
                .catch(error => reject(error));
        });
    }

    /**
     *
     * @returns {Promise}
     */
    status() {
        return new Promise((resolve, reject) => {
            Fs.find(stop_condition, this.config.frameDir)
                .then(frames => resolve(frames.map(file => Frame.fromFile(this.config, file))))
                .catch(error => reject(error));
        });
    }

    /**
     *
     * @returns {Promise}
     */
    log() {
        return new Promise((resolve, reject) => {
            let frames = {},
                times = {};

            new FrameCollection(this.config)
                .forEach((frame, done) => {
                    if (frame.stop === false) return done();
                    let date = frame.date.format('YYYY-MM-DD');

                    if (!frames[date]) frames[date] = [];
                    if (!times[date]) times[date] = 0;

                    frames[date].push(frame);
                    times[date] += Math.ceil(frame.duration);

                    done();
                })
                .then(() => new Promise(r => {
                    resolve({frames, times});
                    r();
                }))
                .catch(error => reject(error));
        });
    }

    /**
     *
     * @returns {Promise}
     */
    resume(frame) {
        return new Promise((resolve, reject) => {
            if (!frame) {
                return reject("No task found to resume.");
            }
            this.start(frame.project, frame.resource.type, frame.resource.id, frame.note)
                .then(frame => resolve(frame))
                .catch(error => reject(error));
        });
    }

    list(project, state, my) {
        this.config.set('project', project);
        return (new classes['issue'](this.config, {})).list(this.config.get('project'), state, my);
    }

    /**
     *
     * @param project
     * @param type
     * @param id
     * @returns {Promise}
     */
    start(project, type, id, note) {
        this.config.set('project', project);

        return new Promise((resolve, reject) => {
            Fs.find(stop_condition, this.config.frameDir)
                .then(frames => {
                    if (frames.length > 0)
                        return reject("Already running. Please stop it first with 'gtt stop'.");

                    resolve(new Frame(this.config, id, type, note).startMe());
                })
                .catch(error => reject(error));
        })
    }

    /**
     *
     * @returns {Promise}
     */
    stop() {
        return new Promise((resolve, reject) => {
            Fs.find(stop_condition, this.config.frameDir)
                .then(frames => {
                    if (frames.length === 0)
                        return reject('No projects started.');

                    resolve(frames.map(file => {
                        return Frame.fromFile(this.config, file).stopMe();
                    }));
                })
                .catch(error => reject(error));
        });
    }

    /**
     *
     * @returns {Promise}
     */
    cancel() {
        return new Promise((resolve, reject) => {
            Fs.find(stop_condition, this.config.frameDir)
                .then(frames => {
                    if (frames.length === 0)
                        return reject('No projects started.');

                    resolve(frames.map(file => {
                        let frame = Frame.fromFile(this.config, file);
                        Fs.remove(file);

                        return frame;
                    }));
                })
                .catch(error => reject(error));
        });
    }
}

export default tasks;
