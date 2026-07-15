import fs from 'fs';
import os from 'os';
import path from 'path';
import { expect } from 'chai';
import Config from '../../src/core/config.js';
import Frame from '../../src/timekeeping/storage/frame.js';

describe('frame class', () => {
    let config, dir;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtt-frame-'));
        config = new Config();
        config.frameDir = dir;
        config.set('project', 'group/project');
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('marks frames for not-yet-existing resources as new', () => {
        expect(new Frame(config, 'a new issue', 'issue').resource.new).to.equal(true);
        expect(new Frame(config, 42, 'issue').resource.new).to.equal(undefined);
    });

    it('persists on start/stop and round-trips through fromFile', () => {
        const frame = new Frame(config, 42, 'issue', 'a note').startMe();
        frame.stopMe();

        const loaded = Frame.fromFile(config, frame.file);

        expect(loaded.id).to.equal(frame.id);
        expect(loaded.project).to.equal('group/project');
        expect(loaded.resource).to.deep.equal({ id: 42, type: 'issue' });
        expect(loaded.note).to.equal('a note');
        expect(loaded.start.isSame(frame.start)).to.equal(true);
        expect(loaded.stop.isSame(frame.stop)).to.equal(true);
    });

    it('computes the duration in seconds', () => {
        const frame = Frame.fromJson(config, {
            id: 'abc',
            project: 'group/project',
            resource: { id: 42, type: 'issue' },
            notes: [],
            start: '2026-01-05T10:00:00Z',
            stop: '2026-01-05T11:30:00Z',
            timezone: 'UTC'
        });

        expect(frame.duration).to.equal(5400);
    });

    it('rejects invalid start and stop dates', () => {
        const json = {
            id: 'abc',
            project: 'group/project',
            resource: { id: 42, type: 'issue' },
            notes: [],
            start: '2026-01-05T10:00:00Z',
            stop: false,
            timezone: 'UTC'
        };

        expect(() => Frame.fromJson(config, { ...json, start: 'not a date' })).to.throw(/Start date/);
        expect(() => Frame.fromJson(config, { ...json, stop: 'not a date' })).to.throw(/Stop date/);
    });

    it('validates dates set through the setters', () => {
        const frame = new Frame(config, 42, 'issue').startMe();

        expect(() => {
            frame.stop = 'not a date';
        }).to.throw();

        frame.stop = '2026-01-05T11:30:00Z';
        expect(frame.stop.isSame('2026-01-05T11:30:00Z')).to.equal(true);
    });

    it('rejects a frame with no start date at all', () => {
        const json = {
            id: 'abc',
            project: 'group/project',
            resource: { id: 42, type: 'issue' },
            notes: [],
            start: false,
            stop: false,
            timezone: 'UTC'
        };

        expect(() => Frame.fromJson(config, json)).to.throw(/Start date/);
    });

    it('persists start/stop as strings even without a timezone configured', () => {
        config.set('timezone', false, true);

        const frame = new Frame(config, 42, 'issue').startMe();
        frame.stopMe();

        expect(frame._start).to.be.a('string');
        expect(frame._stop).to.be.a('string');

        const loaded = Frame.fromFile(config, frame.file);
        expect(loaded.start.isSame(frame.start)).to.equal(true);
        expect(loaded.stop.isSame(frame.stop)).to.equal(true);
    });
});
