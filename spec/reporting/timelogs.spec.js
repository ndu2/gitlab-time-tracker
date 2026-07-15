import { expect } from 'chai';
import sinon from 'sinon';
import dayjs from '../../src/core/dayjs.js';
import fetchTimelogs, { timelogsFor } from '../../src/reporting/api/timelogs.js';

function page(nodes, hasNextPage, endCursor = null) {
    return {
        body: {
            data: {
                project: {
                    timelogs: {
                        pageInfo: { hasNextPage, endCursor },
                        nodes
                    }
                }
            }
        }
    };
}

function node(id) {
    return { id, user: { username: 'alice' }, spentAt: '2026-01-01', timeSpent: 60 };
}

describe('fetchTimelogs', () => {
    let client, from, to;

    beforeEach(() => {
        client = { graphQL: sinon.stub() };
        from = dayjs('2026-01-01');
        to = dayjs('2026-01-31');
    });

    it('returns the flat, ordered concatenation of all pages', async () => {
        client.graphQL
            .onCall(0).resolves(page([node(1), node(2)], true, 'cursor-1'))
            .onCall(1).resolves(page([node(3)], false));

        const timelogs = await fetchTimelogs(client, 'group/project', from, to);

        expect(timelogs.map(t => t.id)).to.deep.equal([1, 2, 3]);
    });

    it('requests each page with the previous page\'s end cursor, in order', async () => {
        client.graphQL
            .onCall(0).resolves(page([node(1)], true, 'cursor-1'))
            .onCall(1).resolves(page([node(2)], false));

        await fetchTimelogs(client, 'group/project', from, to);

        expect(client.graphQL.firstCall.args[0].variables.after).to.equal('');
        expect(client.graphQL.secondCall.args[0].variables.after).to.equal('cursor-1');
        expect(client.graphQL.firstCall.args[0].variables.project).to.equal('group/project');
    });

    it('returns an empty array when the response has errors', async () => {
        client.graphQL.resolves({ body: { errors: [{ message: 'nope' }] } });

        const timelogs = await fetchTimelogs(client, 'group/project', from, to);

        expect(timelogs).to.deep.equal([]);
    });

    it('returns an empty array when nodes is missing', async () => {
        client.graphQL.resolves({ body: { data: { project: { timelogs: { pageInfo: { hasNextPage: false } } } } } });

        const timelogs = await fetchTimelogs(client, 'group/project', from, to);

        expect(timelogs).to.deep.equal([]);
    });

    it('stops after a single page when hasNextPage is false', async () => {
        client.graphQL.resolves(page([node(1)], false));

        await fetchTimelogs(client, 'group/project', from, to);

        expect(client.graphQL.callCount).to.equal(1);
    });
});

describe('timelogsFor', () => {
    const timelogs = [
        { issues: { iid: 1, projectId: 10 }, id: 'a' },
        { issues: { iid: 2, projectId: 10 }, id: 'b' },
        { mergeRequests: { iid: 1, projectId: 10 }, id: 'c' },
        { issues: { iid: 1, projectId: 99 }, id: 'd' } // same iid, different project
    ];

    it('matches issues by iid and project_id', () => {
        const matches = timelogsFor(timelogs, 'issues', { iid: 1, project_id: 10 });

        expect(matches.map(t => t.id)).to.deep.equal(['a']);
    });

    it('matches merge requests by iid and project_id, independently of issues', () => {
        const matches = timelogsFor(timelogs, 'mergeRequests', { iid: 1, project_id: 10 });

        expect(matches.map(t => t.id)).to.deep.equal(['c']);
    });

    it('excludes entries from a different project sharing the same iid', () => {
        const matches = timelogsFor(timelogs, 'issues', { iid: 1, project_id: 999 });

        expect(matches).to.deep.equal([]);
    });
});
