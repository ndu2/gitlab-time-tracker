
import moment from 'moment';
import Config from '../../src/core/file-config.js';
import Time from '../../src/core/time.js';
import issue from '../../src/core/issue.js';
import mergeRequest from '../../src/core/mergeRequest.js';
import { expect } from 'chai';

describe('time class', () => {
    it('Returns title of parent Issue', () => {
        const config = new Config(process.cwd());
        const parent = new issue(config, {title: "Test title"})
        const time = new Time('1h', moment(), {}, parent,  config);

        expect(time.title).to.be.equal("Test title");
    });

    it('Returns title of parent MergeRequest', () => {
        const config = new Config(process.cwd());
        const parent = new mergeRequest(config, {title: "Test title"})
        const time = new Time('1h', moment(), {}, parent,  config);

        expect(time.title).to.be.equal("Test title");
    });

    it('Returns Null for missed title or parent', () => {
        const config = new Config(process.cwd());
        const parent = new mergeRequest(config, {});
        let time;
        time = new Time('1h', moment(), {}, parent,  config);
        expect(time.title).to.be.equal(null);

        time = new Time('1h', moment(), {}, null,  config);
        expect(time.title).to.be.equal(null);
    });
});

