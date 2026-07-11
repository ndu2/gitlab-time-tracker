import { expect } from 'chai';
import { excludeByLabel, excludeMoved } from '../../src/reporting/filters.js';

function item(iid, labels = []) {
    return { iid, labels };
}

describe('excludeByLabel', () => {
    it('returns items unchanged when there are no exclude labels', () => {
        const items = [item(1, ['bug'])];

        expect(excludeByLabel(items, null)).to.deep.equal(items);
        expect(excludeByLabel(items, undefined)).to.deep.equal(items);
        expect(excludeByLabel(items, false)).to.deep.equal(items);
    });

    it('drops items carrying any of the excluded labels', () => {
        const items = [item(1, ['bug']), item(2, ['wontfix']), item(3, ['bug', 'wontfix']), item(4, [])];

        const result = excludeByLabel(items, ['wontfix']);

        expect(result.map(i => i.iid)).to.deep.equal([1, 4]);
    });
});

describe('excludeMoved', () => {
    it('drops issues that have been moved to another project', () => {
        const issues = [
            { iid: 1, moved_to_id: null },
            { iid: 2, moved_to_id: 42 },
            { iid: 3 }
        ];

        const result = excludeMoved(issues);

        expect(result.map(i => i.iid)).to.deep.equal([1, 3]);
    });
});
