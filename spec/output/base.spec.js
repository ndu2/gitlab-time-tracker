import dayjs from '../../src/core/dayjs.js';
import { expect } from 'chai';
import Config from '../../src/core/config.js';
import Output from '../../src/reporting/output/base.js';
import calculateStats from '../../src/reporting/stats.js';

function makeTime({ user = 'alice', seconds = 0, date = '2026-01-05T10:00:00Z', iid = 1, project = 'group/project' } = {}) {
    return { user, seconds, iid, project_namespace: project, date: dayjs(date) };
}

function makeIssue({ iid = 1, labels = [], times = [], days = {}, estimate = 0, spent = 0 } = {}) {
    return {
        iid,
        labels,
        times,
        days,
        stats: { time_estimate: estimate, total_time_spent: spent }
    };
}

describe('calculateStats', () => {
    let config;

    beforeEach(() => {
        config = new Config();
    });

    function calculate(issues = [], mergeRequests = []) {
        return calculateStats(config, { issues, mergeRequests });
    }

    it('aggregates spent time per user and per project', () => {
        const output = calculate([
            makeIssue({
                iid: 1, times: [
                    makeTime({ user: 'alice', seconds: 3600 }),
                    makeTime({ user: 'bob', seconds: 1800 })
                ]
            }),
            makeIssue({
                iid: 2, times: [
                    makeTime({ user: 'alice', seconds: 1800, project: 'group/other' })
                ]
            })
        ]);

        expect(output.spent).to.equal(7200);
        expect(output.users).to.deep.equal({ alice: '1h 30m', bob: '30m' });
        expect(output.projects).to.deep.equal({ 'group/project': '1h 30m', 'group/other': '30m' });
        expect(output.stats.spent).to.equal('2h');
    });

    it('sums estimates and total spent across issues and merge requests', () => {
        const output = calculate(
            [makeIssue({ iid: 1, estimate: '3600', spent: '7200' })],
            [makeIssue({ iid: 1, estimate: '1800', spent: '900' })]
        );

        expect(output.totalEstimate).to.equal(5400);
        expect(output.totalSpent).to.equal(8100);
        expect(output.stats['total estimate']).to.equal('1h 30m');
        expect(output.stats['total spent']).to.equal('2h 15m');
    });

    it('tracks free and half price time by label', () => {
        config.set('freeLabels', ['pro bono']);
        config.set('halfPriceLabels', ['discount']);

        const output = calculate([
            makeIssue({ iid: 1, labels: ['pro bono'], times: [makeTime({ seconds: 3600 })] }),
            makeIssue({ iid: 2, labels: ['discount', 'bug'], times: [makeTime({ seconds: 1800 })] }),
            makeIssue({ iid: 3, labels: ['bug'], times: [makeTime({ seconds: 60 })] })
        ]);

        expect(output.spentFree).to.equal(3600);
        expect(output.spentHalfPrice).to.equal(1800);
        expect(output.spent).to.equal(5460);
    });

    it('treats missing free/half price label config as empty', () => {
        const output = calculate([
            makeIssue({ iid: 1, labels: ['bug'], times: [makeTime({ seconds: 3600 })] })
        ]);

        expect(output.spentFree).to.equal(0);
        expect(output.spentHalfPrice).to.equal(0);
    });

    it('sorts issues by iid and times by date, newest first', () => {
        const report = {
            issues: [
                makeIssue({ iid: 1, times: [makeTime({ date: '2026-01-01T10:00:00Z' })] }),
                makeIssue({ iid: 3, times: [makeTime({ date: '2026-01-03T10:00:00Z' })] }),
                makeIssue({ iid: 2, times: [makeTime({ date: '2026-01-02T10:00:00Z' })] })
            ],
            mergeRequests: []
        };
        const output = calculateStats(config, report);

        expect(report.issues.map(issue => issue.iid)).to.deep.equal([3, 2, 1]);
        expect(output.times.map(time => time.date.format('YYYY-MM-DD'))).to.deep.equal([
            '2026-01-03', '2026-01-02', '2026-01-01'
        ]);
    });

    it('consolidates per-day data of all issues', () => {
        const output = calculate([
            makeIssue({ iid: 1, days: { '2026-01-01': 'a' } }),
            makeIssue({ iid: 2, days: { '2026-01-01': 'b', '2026-01-02': 'c' } })
        ]);

        expect(output.daysNew).to.deep.equal({
            '2026-01-01': ['a', 'b'],
            '2026-01-02': ['c']
        });
    });
});

describe('Output.prepare', () => {
    it('formats dayjs dates, replaces null/undefined and picks columns in order', () => {
        const config = new Config();
        config.set('dateFormat', 'YYYY-MM-DD');

        const output = new Output(config, { issues: [], mergeRequests: [] });
        const row = output.prepare({
            iid: 7,
            date: dayjs('2026-01-05T10:00:00Z'),
            missing: null,
            labels: ['a', 'b']
        }, ['iid', 'date', 'missing', 'undefined_column', 'labels']);

        expect(row).to.deep.equal([7, '2026-01-05', '', '', 'a,b']);
    });
});
