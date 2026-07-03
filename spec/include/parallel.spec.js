import { expect } from 'chai';
import Config from '../../src/core/config.js';
import parallel from '../../src/core/parallel.js';

const tick = () => new Promise(resolve => setImmediate(resolve));

describe('parallel', () => {
    let config;

    beforeEach(() => {
        config = new Config();
    });

    it('processes every task', async () => {
        const seen = [];

        await parallel([1, 2, 3, 4, 5], async task => {
            await tick();
            seen.push(task);
        }, config);

        expect(seen.sort()).to.deep.equal([1, 2, 3, 4, 5]);
    });

    it('accepts plain sync workers', async () => {
        const seen = [];

        await parallel([1, 2], task => seen.push(task), config);

        expect(seen).to.deep.equal([1, 2]);
    });

    it('never runs more workers than the runner limit', async () => {
        let active = 0;
        let peak = 0;

        await parallel(Array.from({ length: 12 }, (_, i) => i), async () => {
            active++;
            peak = Math.max(peak, active);
            await tick();
            active--;
        }, config, 3);

        expect(peak).to.be.at.most(3);
    });

    it('rejects with the first worker error and starts no further tasks', async () => {
        const started = [];
        let caught = null;

        try {
            await parallel([1, 2, 3, 4, 5], async task => {
                started.push(task);
                await tick();
                if (task === 1) throw new Error('boom');
            }, config, 1);
        } catch (error) {
            caught = error;
        }

        expect(caught).to.be.an('error').with.property('message', 'boom');
        expect(started).to.deep.equal([1]);
    });

    it('handles an empty task list', async () => {
        await parallel([], () => {
            throw new Error('should not run');
        }, config);
    });
});
