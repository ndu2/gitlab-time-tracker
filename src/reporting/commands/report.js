import fs from 'fs';
import {Command} from 'commander';
import moment from 'moment';
import Cli from '../../core/cli.js';
import Config from '../../core/file-config.js';
import Report from '../api/report.js';
import Owner from '../../core/owner.js';
import ReportCollection from '../api/reportCollection.js';
import GitlabClient from '../../core/gitlab-client.js';
import parallel from '../../core/parallel.js';
// output backends are imported lazily so timekeeping commands never pull in
// the heavy deps (swissqrbill, markdown-table, csv-string, cli-table)
const Output = {
    table: () => import('../output/table.js'),
    csv: () => import('../output/csv.js'),
    markdown: () => import('../output/markdown.js'),
    invoice: () => import('../output/invoice.js')
};

// this collects options
function collect(val, arr) {
    if (!arr) arr = [];
    arr.push(val);

    return [...new Set(arr)];
}


function report() {
    const report = new Command('report', 'generate a report for the given project and issues')
    .arguments('[project] [ids...]')
    .option('-e --type <type>', 'specify the query type: project, user, group')
    .option('--subgroups', 'include sub groups')
    .option('--url <url>', 'URL to GitLabs API')
    .option('--token <token>', 'API access token')
    .option('-f --from <from>', 'query times that are equal or greater than the given date')
    .option('-t --to <to>', 'query times that are equal or smaller than the given date')
    .option('--today', 'ignores --from and --to and queries entries for today')
    .option('--this_week', 'ignores --from and --to and queries entries for this week')
    .option('--this_month', 'ignores --from and --to and queries entries for this month')
    .option('--last_month', 'ignores --from and --to and queries entries for last month')
    .option('-c --closed', 'include closed issues')
    .option('-m --milestone <milestone>', 'include issues from the given milestone')
    .option('--hours_per_day <hours>', 'hours per day for human readable time formats')
    .option('-u --user <user>', 'only query times from the given user')
    .option('-q --query <query>', 'query the given data types: issues, merge_requests', collect, null)
    .option('-r --report <report>', 'include in the report: stats, issues, merge_requests, records', collect, null)
    .option('-o --output <output>', 'use the given output')
    .option('-l --file <file>', 'save report to the given file')
    .option('--include_by_labels <labels>', 'only include issues that have the given labels', collect, null)
    .option('--exclude_by_labels <labels>', 'exclude issues that have the given labels', collect, null)
    .option('--include_labels <labels>', 'only include the given labels in the report', collect, null)
    .option('--exclude_labels <labels>', 'exclude the given labels in the report', collect, null)
    .option('--date_format <date>', 'use the given date format in the report', collect, null)
    .option('--time_format <time>', 'use the given time format in the report')
    .option('--no_headlines', 'hide headlines in the report')
    .option('--no_warnings', 'hide warnings in the report')
    .option('--record_columns <columns>', 'include the given columns in the record part of the report', collect, null)
    .option('--issue_columns <columns>', 'include the given columns in the issue part of the report', collect, null)
    .option('--merge_request_columns <columns>', 'include the given columns in the merge request part of the report', collect, null)
    .option('--user_columns', 'include user columns in the report')
    .option('--quiet', 'only output report')
    .option('--verbose', 'show verbose output')
    .option('--show_without_times', 'show issues/merge requests without time records')
    .option('--invoiceTitle <title>', 'title on invoice')
    .option('--invoiceReference <reference>', 'payment reference on invoice')
    .option('--invoiceText <text>', 'text above positions')
    .option('--invoiceAddress [address...]', 'address')
    .option('--invoiceCurrency <currency>', 'currecnty on invoice')
    .option('--invoiceCurrencyPerHour <number>', 'hourly wage rate on invoice')
    .option('--invoiceVAT <number>', 'vat decimal (20% = 0.2)')
    .option('--invoiceDate <number>', 'date string')
    .option('--invoiceTimeMaxUnit <number>', 'rounds up invoice times, e.g. 60 rounds every issue per day to 1 minute')
    .option('--invoiceCurrencyMaxUnit <number>', 'rounding invoice total, e.g. 0.01, 0.05 or 1')
    .option('--invoicePositionText <text>', 'invoice position text')
    .option('--invoicePositionExtra <text>', 'extra invoice position: header text')
    .option('--invoicePositionExtraText <text>', 'extra invoice position: text')
    .option('--invoicePositionExtraValue <number>', 'extra invoice position: value')
    .action(async (project, ids, options, program) => {

// init helpers
let config = new Config(process.cwd());
let cli = new Cli(program.args);

// overwrite config with args and opts
config
    .set('url', program.opts().url)
    .set('token', program.opts().token)
    .set('project', cli.project())
    .set('iids', cli.iids())
    .set('from', program.opts().from)
    .set('to', program.opts().to)
    .set('closed', program.opts().closed)
    .set('user', program.opts().user)
    .set('milestone', program.opts().milestone)
    .set('includeByLabels', program.opts().include_by_labels)
    .set('excludeByLabels', program.opts().exclude_by_labels)
    .set('includeLabels', program.opts().include_labels)
    .set('excludeLabels', program.opts().exclude_labels)
    .set('dateFormat', program.opts().date_format)
    .set('timeFormat', program.opts().time_format)
    .set('hoursPerDay', program.opts().hours_per_day)
    .set('output', program.opts().output)
    .set('file', program.opts().file)
    .set('query', program.opts().query)
    .set('report', program.opts().report)
    .set('recordColumns', program.opts().record_columns)
    .set('issueColumns', program.opts().issue_columns)
    .set('mergeRequestColumns', program.opts().merge_request_columns)
    .set('noHeadlines', program.opts().no_headlines)
    .set('noWarnings', program.opts().no_warnings)
    .set('quiet', program.opts().quiet)
    .set('showWithoutTimes', program.opts().show_without_times)
    .set('userColumns', program.opts().user_columns)
    .set('type', program.opts().type)
    .set('subgroups', program.opts().subgroups)
    .set('_verbose', program.opts().verbose)
    .set('invoiceTitle', program.opts().invoiceTitle)
    .set('invoiceReference', program.opts().invoiceReference)
    .set('invoiceText', program.opts().invoiceText)
    .set('invoiceAddress', program.opts().invoiceAddress)
    .set('invoiceCurrency', program.opts().invoiceCurrency)
    .set('invoiceCurrencyPerHour', program.opts().invoiceCurrencyPerHour)
    .set('invoiceVAT', program.opts().invoiceVAT)
    .set('invoiceDate', program.opts().invoiceDate)
    .set('invoiceTimeMaxUnit', program.opts().invoiceTimeMaxUnit)
    .set('invoiceCurrencyMaxUnit', program.opts().invoiceCurrencyMaxUnit)
    .set('invoicePositionText', program.opts().invoicePositionText)
    .set('invoicePositionExtra', program.opts().invoicePositionExtra)
    .set('invoicePositionExtraText', (program.opts().invoicePositionExtraText? program.opts().invoicePositionExtraText: "").split(','))
    .set('invoicePositionExtraValue', (program.opts().invoicePositionExtraValue? program.opts().invoicePositionExtraValue: "").split(','));

// date shortcuts
if (program.opts().today)
    config
        .set('from', moment().startOf('day'))
        .set('to', moment().endOf('day'));
if (program.opts().this_week)
    config
        .set('from', moment().startOf('week'))
        .set('to', moment().endOf('week'));
if (program.opts().this_month)
    config
        .set('from', moment().startOf('month'))
        .set('to', moment().endOf('month'));
if (program.opts().last_month)
    config
        .set('from', moment().subtract(1, 'months').startOf('month'))
        .set('to', moment().subtract(1, 'months').endOf('month'));

Cli.quiet = config.get('quiet');
Cli.verbose = config.get('_verbose');

// check extra Text/value arrays
if(config.get('invoicePositionExtraText').length != config.get('invoicePositionExtraValue').length) {
    Cli.error(`invoicePositionExtraText and invoicePositionExtraValue length do not match`);
}

// create stuff
let client = new GitlabClient(config),
    reports = new ReportCollection(config),
    master = new Report(config, undefined, client),
    projectLabels = Array.isArray(config.get('project')) ? config.get('project').join('", "') : config.get('project'),
    projects = Array.isArray(config.get('project')) ? config.get('project') : [config.get('project')],
    output;

// warnings
if (config.get('iids').length >= 1 && config.get('query').length > 1) {
    Cli.warn(`The ids argument is ignored when querying issues and merge requests`);
}
if (config.get('iids').length >= 1 && (config.get('type') !== 'project' || projects.length > 1)) {
    Cli.warn(`The ids argument is ignored when querying multiple projects`);
}
if ((config.get('report').includes('issues') && !config.get('query').includes('issues'))) {
    Cli.warn(`Issues are included in the report but not queried.`);
}
if ((config.get('report').includes('merge_requests') && !config.get('query').includes('merge_requests'))) {
    Cli.warn(`Merge Requests are included in the report but not queried.`);
}
if (!config.get('project')) {
    Cli.error(`Missing project(s) or group(s) namespace. Try this: gtt report "username/project-name"`);
}
if (!Output[config.get('output')]) {
    Cli.error(`The output ${config.get('output')} doesn't exist. Available outputs: ${Object.keys(Output).join(',')}`);
}
if (!config.get('from').isValid()) {
    Cli.error(`FROM is not in a valid ISO date format.`);
}
if (!config.get('to').isValid()) {
    Cli.error(`TO is not a in valid ISO date format.`);
}

// file prompt
if (config.get('file') && fs.existsSync(config.get('file'))) {
    try {
        await Cli.ask(`The file "${config.get('file')}" already exists. Overwrite?`);
    } catch (error) {
        Cli.error(`can't write file.`, error);
    }
}

// get project(s)
Cli.list(`${Cli.look}  Resolving "${projectLabels}"`);
let owner = new Owner(config, client);

try {
    await owner.authorized();
} catch (error) {
    Cli.x(`Invalid access token!`, error);
}

try {
    await parallel(projects, async (project, done) => {
        try {
            switch (config.get('type')) {
                case 'project': {
                    let report = new Report(config, undefined, client);
                    try {
                        await report.getProject(project);
                    } catch (error) {
                        Cli.x(`Project not found or no access rights "${projectLabels}".`, error);
                    }
                    reports.push(report);
                    break;
                }

                case 'group': {
                    await owner.getGroup(project);
                    if (config.get('subgroups')) await owner.getSubGroups();
                    await owner.getProjectsByGroup();
                    owner.projects.forEach(project => reports.push(new Report(config, project, client)));
                    break;
                }
            }
            done();
        } catch (error) {
            done(error);
        }
    }, config, 1);

    config.set('project', projects);
    Cli.out(`\r${Cli.look}  Selected projects: ${reports.reports.map(r => r.project.name.bold.blue).join(', ')}\n`);

    // get members and user columns
    if (config.get('userColumns')) {
        await reports.forEach(async (report, done) => {
            try {
                await report.project.members();
                let columns = report.project.users.map(user => `time_${user}`);

                config.set('issueColumns', [...new Set(config.get('issueColumns').concat(columns))]);
                config.set('mergeRequestColumns', [...new Set(config.get('mergeRequestColumns').concat(columns))]);

                done();
            } catch (error) {
                done(error);
            }
        });
    }

    Cli.mark();
} catch (error) {
    Cli.x(`Could not resolve "${projectLabels}"`, error);
}

// get issues
if (config.get('query').includes('issues')) {
    Cli.list(`${Cli.fetch}  Fetching issues`);

    try {
        await reports.forEach(async (report, done) => {
            try {
                await report.getIssues();
                done();
            } catch (error) {
                done(error);
            }
        });
    } catch (error) {
        Cli.x(`could not fetch issues.`, error);
    }

    Cli.mark();
}

// get merge requests
if (config.get('query').includes('merge_requests')) {
    Cli.list(`${Cli.fetch}  Fetching merge requests`);

    try {
        await reports.forEach(async (report, done) => {
            try {
                await report.getMergeRequests();
                done();
            } catch (error) {
                done(error);
            }
        });
    } catch (error) {
        Cli.x(`could not fetch merge requests.`, error);
    }

    Cli.mark();
}

// get timelogs
Cli.list(`${Cli.fetch}  Loading timelogs`);

try {
    await reports.forEach(async (report, done) => {
        try {
            await report.getTimelogs();
            done();
        } catch (error) {
            done(error);
        }
    });
} catch (error) {
    Cli.x(`could not load timelogs.`, error);
}

Cli.mark();

// merge reports
Cli.list(`${Cli.merge}  Merging reports`);

try {
    await reports.forEach((report, done) => {
        master.merge(report);
        done();
    });
} catch (error) {
    Cli.x(`could not merge reports.`, error);
}

Cli.mark();

// process issues
if (config.get('query').includes('issues') && master.issues.length > 0) {
    Cli.bar(`${Cli.process}️  Processing issues`, master.issues.length);

    try {
        await master.processIssues(() => Cli.advance());
    } catch (error) {
        Cli.x(`could not process issues.`, error);
    }

    Cli.mark();
}

// process merge requests
if (config.get('query').includes('merge_requests') && master.mergeRequests.length > 0) {
    Cli.bar(`${Cli.process}️️  Processing merge requests`, master.mergeRequests.length);

    try {
        await master.processMergeRequests(() => Cli.advance());
    } catch (error) {
        Cli.x(`could not process merge requests.`, error);
    }

    Cli.mark();
}

// make report
if (master.issues.length === 0 && master.mergeRequests.length === 0)
    Cli.error('No issues or merge requests matched your criteria.');

try {
    let module = await Output[config.get('output')]();

    Cli.list(`${Cli.output}  Making report`);
    output = new module.default(config, master);
    output.make();
} catch (error) {
    Cli.x(`could not make report.`, error);
}

Cli.mark();

// print report
Cli.list(`${Cli.print}  Printing report`);

try {
    if (config.get('file')) {
        output.toFile(config.get('file'));
    } else {
        output.toStdOut();
    }
} catch (error) {
    Cli.x(`could not print report.`, error);
}

Cli.mark();

// time for a beer
Cli.done();
});
return report;
}

export default report;
