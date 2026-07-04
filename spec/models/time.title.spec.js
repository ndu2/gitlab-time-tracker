
import dayjs from '../../src/core/dayjs.js';
import Config from '../../src/core/config.js';
import Time from '../../src/core/time.js';
import task from '../../src/core/task.js';
import { expect } from 'chai';

describe('time class', () => {
    it('Returns title of parent Issue', () => {
        const config = new Config(process.cwd());
        const parent = new task(config, {title: "Test title"}, undefined, 'issues')
        const time = new Time('1h', dayjs(), {}, parent,  config);

        expect(time.title).to.be.equal("Test title");
    });

    it('Returns title of parent MergeRequest', () => {
        const config = new Config(process.cwd());
        const parent = new task(config, {title: "Test title"}, undefined, 'merge_requests')
        const time = new Time('1h', dayjs(), {}, parent,  config);

        expect(time.title).to.be.equal("Test title");
    });

    it('Returns Null for missed title or parent', () => {
        const config = new Config(process.cwd());
        const parent = new task(config, {}, undefined, 'merge_requests');
        let time;
        time = new Time('1h', dayjs(), {}, parent,  config);
        expect(time.title).to.be.equal(null);

        time = new Time('1h', dayjs(), {}, null,  config);
        expect(time.title).to.be.equal(null);
    });
});

