import Table from 'cli-table';
import Output from './base.js';
import pc from 'picocolors';

const format = {
    headline: h => `\n${pc.bold(pc.underline(h))}\n`,
    warning: w => pc.yellow(w)
};

/**
 * stdout table output
 */
class TableOutput extends Output {
    constructor(config, report) {
        super(config, report);
        this.format = format;
    }

    makeStats() {
        this.headline('TIME STATS');

        let stats = '';

        Object.entries(this.stats).forEach(([name, time]) => stats += `\n* ${pc.red(name)}: ${time}`);
        stats += `\n`;

        if (this.projects.length > 1) {
            Object.entries(this.projects).forEach(([name, time]) => stats += `\n* ${pc.red(name)}: ${time}`);
            stats += `\n`;
        }

        Object.entries(this.users).forEach(([name, time]) => stats += `\n* ${pc.red(name)}: ${time}`);

        this.write(stats.substr(1));
    }

    makeIssues() {
        this.headline('ISSUES');

        if (this.report.issues.length === 0)
            return this.warning('No issues found');

        let issues = new Table({head: this.config.get('issueColumns').map(c => c.replace('_', ' '))});
        this.report.issues.forEach(issue => issues.push(this.prepare(issue, this.config.get('issueColumns'))));
        this.write(issues.toString());
    }

    makeMergeRequests() {
        this.headline('MERGE REQUESTS');

        if (this.report.mergeRequests.length === 0)
            return this.warning('No merge requests found');

        let mergeRequests = new Table({head: this.config.get('mergeRequestColumns').map(c => c.replace('_', ' '))});
        this.report.mergeRequests.forEach(mergeRequest => mergeRequests.push(this.prepare(mergeRequest, this.config.get('mergeRequestColumns'))));
        this.write(mergeRequests.toString());
    }

    makeDailyStats() {
        this.headline('DAILY RECORDS');

        var tabledt = new Table({head: ['date', 'time']});
        var tabledit = new Table({head: ['date', 'project', 'iid', 'time']});
        let days = Object.keys(this.days);
        days.sort();
        days.forEach(
            k => {
                let day = this.days[k];
                let refD = this.daysMoment[k].format(this.config.get('dateFormat'));
                let projects = Object.keys(day);
                let time = 0;
                projects.forEach(
                    p => {
                    let iids = Object.keys(day[p]);
                    iids.sort();
                    iids.forEach(
                        iid => {
                            tabledit.push([refD, p, iid, this.config.toHumanReadable(day[p][iid], 'records')]);
                            time += day[p][iid];
                        });
                    });
                tabledt.push([refD, this.config.toHumanReadable(time)]);
            });
        this.write(tabledt.toString());
        this.write(tabledit.toString());
    }

    makeRecords() {
        this.makeDailyStats();
        this.headline('TIME RECORDS');
        let times = new Table({head: this.config.get('recordColumns').map(c => c.replace('_', ' '))});
        this.times.forEach(time => times.push(this.prepare(time, this.config.get('recordColumns'))));
        this.write(times.toString());
    }
}

export default TableOutput;