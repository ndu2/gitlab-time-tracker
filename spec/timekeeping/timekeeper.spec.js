import { expect } from 'chai';
import sinon from 'sinon';
import Config from '../../src/core/config.js';
import Task from '../../src/core/api/task.js';
import Timekeeper from '../../src/timekeeping/timekeeper.js';

function fakeFrames(frames) {
    return {
        length: frames.length,
        forEach: (iterator) => Promise.all(frames.map(frame => iterator(frame)))
    };
}

function makeFrame({ project = 'group/project', type = 'issue', id = 1, duration = 3600, notes = [], isNew = false } = {}) {
    return {
        project,
        resource: { type, id, ...(isNew ? { new: true } : {}) },
        duration,
        notes,
        note: null,
        _stop: '2026-01-01T00:00:00Z',
        title: null,
        write: sinon.spy()
    };
}

describe('Timekeeper', () => {
    let config, timekeeper, make, createTime, getNotes;

    beforeEach(() => {
        config = new Config();
        timekeeper = new Timekeeper(config);

        make = sinon.stub(Task.prototype, 'make').callsFake(function (project, id) {
            this.data = { title: `title for ${id}`, iid: 99 };
            return Promise.resolve(this);
        });
        createTime = sinon.stub(Task.prototype, 'createTime').resolves({ id: 'gid://gitlab/Note/555' });
        getNotes = sinon.stub(Task.prototype, 'getNotes').resolves([]);
    });

    afterEach(() => {
        make.restore();
        createTime.restore();
        getNotes.restore();
    });

    describe('pendingFrames', () => {
        it('is exposed as a public interface used by both sync and archiveInit', () => {
            expect(timekeeper.pendingFrames).to.be.a('function');
        });
    });

    describe('sync', () => {
        it('returns immediately without touching phases when there is nothing to sync', async () => {
            const onPhase = sinon.spy();

            await timekeeper.sync(fakeFrames([]), { onPhase });

            expect(onPhase.called).to.be.false;
        });

        it('runs resolve, details and update in order with the right totals', async () => {
            const frames = [makeFrame({ id: 1 }), makeFrame({ id: 2 })];
            const phases = [];

            await timekeeper.sync(fakeFrames(frames), {
                onPhase: (phase, total) => phases.push([phase, total])
            });

            expect(phases).to.deep.equal([
                ['resolve', 2], ['details', 2], ['update', 2]
            ]);
        });

        it('resolves each distinct project/type/id once, and skips onProgress for repeats', async () => {
            const frames = [
                makeFrame({ id: 1 }),
                makeFrame({ id: 1 }), // same issue tracked across two frames
                makeFrame({ id: 2 })
            ];
            let resolveProgressCalls = 0;
            let phase = null;

            await timekeeper.sync(fakeFrames(frames), {
                onPhase: (name) => { phase = name; },
                onProgress: () => { if (phase === 'resolve') resolveProgressCalls++; }
            });

            expect(make.callCount).to.equal(2);
            expect(resolveProgressCalls).to.equal(2);
        });

        it('sets frame.title from the resolved resource', async () => {
            const frame = makeFrame({ id: 7 });

            await timekeeper.sync(fakeFrames([frame]));

            expect(frame.title).to.equal('title for 7');
        });

        it('writes a time record note for the untracked duration and persists the frame', async () => {
            const frame = makeFrame({ duration: 3600, notes: [{ id: 1, time: 1000 }] });

            await timekeeper.sync(fakeFrames([frame]));

            expect(createTime.calledOnce).to.be.true;
            expect(createTime.firstCall.args[0]).to.equal(2600);
            expect(frame.notes).to.have.lengthOf(2);
            expect(frame.notes[1]).to.deep.equal({ id: 555, time: 2600 });
            expect(frame.write.calledWith(true)).to.be.true;
        });

        it('promotes a new resource id to the created iid', async () => {
            const frame = makeFrame({ id: 'new-issue-title', isNew: true });

            await timekeeper.sync(fakeFrames([frame]));

            expect(frame.resource.new).to.be.undefined;
            expect(frame.resource.title).to.equal('new-issue-title');
            expect(frame.resource.id).to.equal(99);
        });
    });
});
