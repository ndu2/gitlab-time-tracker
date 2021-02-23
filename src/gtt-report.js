const _ = require('underscore');
const fs = require('fs');
const program = require('commander');
const moment = require('moment');

const Cli = require('./include/cli');
const Config = require('./include/file-config');
const Report = require('./models/report');
const Owner = require('./models/owner');
const ReportCollection = require('./models/reportCollection');

const Output = {
    table: require('./output/table'),
    csv: require('./output/csv'),
    pdf: require('./output/pdf'),
    markdown: require('./output/markdown'),
    invoice: require('./output/invoice'),
    dump: require('./output/dump'),
    xlsx: require('./output/xlsx')
};

// this collects options
function collect(val, arr) {
    if (!arr) arr = [];
    arr.push(val);

    return _.uniq(arr);
}

// set options
program
    .arguments('[project] [ids]')
    .option('-e --type <type>', 'specify the query type: project, user, group')
    .option('--subgroups', 'include sub groups')
    .option('--url <url>', 'URL to GitLabs API')
    .option('--token <token>', 'API access token')
    .option('-p --proxy <proxy>', 'use a proxy server with the given url')
    .option('--insecure', 'don\'t check certificates')
    .option('-f --from <from>', 'query times that are equal or greater than the given date')
    .option('-t --to <to>', 'query times that are equal or smaller than the given date')
    .option('--today', 'ignores --from and --to and queries entries for today')
    .option('--this_week', 'ignores --from and --to and queries entries for this week')
    .option('--this_month', 'ignores --from and --to and queries entries for this month')
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
    .option('--from_dump <file>', 'instead of querying gitlab, use data from the given dump file')
    .option('--invoiceTitle <title>', 'title on invoice')
    .option('--invoiceAddress [address...]', 'address')
    .option('--invoiceCurrency <currency>', 'currecnty on invoice')
    .option('--invoiceCurrencyPerHour <number>', 'hourly wage rate on invoice')
    .option('--invoiceVAT <number>', 'vat decimal (20% = 0.2)')
    .option('--invoiceDate <number>', 'date string')
    .option('--invoiceCurrencyMaxUnit <number>', 'rouning invoice total, e.g. 0.01, 0.05 or 1')
    .parse(process.argv);

// init helpers
let config = new Config(process.cwd());
let cli = new Cli(program.args);

// if using a dump, set the config accordingly
if (program.opts().from_dump && fs.existsSync(program.opts().from_dump)) {
    let data = JSON.parse(fs.readFileSync(program.opts().from_dump));

    if (data.data) _.each(data.data, (v, i) => {
        config.set(i, v);
    });

    if (data._dump) config.dump = data._dump;
}

// if writing a dump, set config accordingly
if (program.opts().output === "dump") {
    config.on("dump-updated", () => {
        new Output['dump'](config);
    });
}

// overwrite config with args and opts
config
    .set('url', program.opts().url)
    .set('token', program.opts().token)
    .set('insecure', program.opts().insecure)
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
    .set('proxy', program.opts().proxy)
    .set('type', program.opts().type)
    .set('subgroups', program.opts().subgroups)
    .set('_verbose', program.opts().verbose)
    .set('invoiceTitle', program.opts().invoiceTitle)
    .set('invoiceAddress', program.opts().invoiceAddress)
    .set('invoiceCurrency', program.opts().invoiceCurrency)
    .set('invoiceCurrencyPerHour', program.opts().invoiceCurrencyPerHour)
    .set('invoiceVAT', program.opts().invoiceVAT)
    .set('invoiceDate', program.opts().invoiceDate)
    .set('invoiceCurrencyMaxUnit', program.opts().invoiceCurrencyMaxUnit)
    .set('_createDump', program.opts().output === 'dump');

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

Cli.quiet = config.get('quiet');
Cli.verbose = config.get('_verbose');

// create stuff
let reports = new ReportCollection(config),
    master = new Report(config),
    projectLabels = _.isArray(config.get('project')) ? config.get('project').join('", "') : config.get('project'),
    projects = _.isArray(config.get('project')) ? config.get('project') : [config.get('project')],
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
if (config.get('output') === 'pdf' && !config.get('file')) {
    Cli.error(`Cannot output a pdf to stdout. You probably forgot to use the --file parameter`);
}
if (!config.get('from').isValid()) {
    Cli.error(`FROM is not in a valid ISO date format.`);
}
if (!config.get('to').isValid()) {
    Cli.error(`TO is not a in valid ISO date format.`);
}
if (config.get('output') === 'xlsx' && !config.get('file')) {
    Cli.error(`Cannot output an xlsx to stdout. You probably forgot to use the --file parameter`);
}

// file prompt
new Promise(resolve => {
    if (config.get('file') && fs.existsSync(config.get('file'))) {
        Cli.ask(`The file "${config.get('file')}" already exists. Overwrite?`)
            .then(() => resolve())
            .catch(error => Cli.error(`can't write file.`, error));
    } else {
        resolve();
    }
})

// get project(s)
    .then(() => new Promise((resolve, reject) => {
        Cli.list(`${Cli.look}  Resolving "${projectLabels}"`);
        let owner = new Owner(config);

        owner.authorized()
            .catch(e => Cli.x(`Invalid access token!`, e))
            .then(() => owner.parallel(projects, (project, done) => {
                config.set('project', project);

                switch (config.get('type')) {
                    case 'project':
                        let report = new Report(config);
                        reports.push(report);
                        report.getProject()
                            .then(() => done())
                            .catch(e => Cli.x(`Project not found or no access rights "${projectLabels}".`, e));
                        break;

                    case 'group':
                        owner.getGroup()
                            .then(() => {
                                if (!config.get('subgroups')) return new Promise(r => r());
                                return owner.getSubGroups();
                            })
                            .then(() => owner.getProjectsByGroup()
                                .then(() => {
                                    owner.projects.forEach(project => reports.push(new Report(config, project)));
                                    done();
                                }))
                            .catch(e => done(e));
                        break;
                }
            }, 1))
            .catch(e => reject(e))
            .then(() => {
                config.set('project', projects);
                resolve();
            });
    }))
    .then(() => Cli.out(`\r${Cli.look}  Selected projects: ${reports.reports.map(r => r.project.name.bold.blue).join(', ')}\n`))

    // get members and user columns
    .then(() => new Promise(resolve => {
        if (!config.get('userColumns')) return resolve();
        reports
            .forEach((report, done) => {
                report.project.members()
                    .then(() => {
                        let columns = report.project.users.map(user => `time_${user}`);

                        config.set('issueColumns', _.uniq(config.get('issueColumns').concat(columns)));
                        config.set('mergeRequestColumns', _.uniq(config.get('mergeRequestColumns').concat(columns)));

                        done();
                    })
                    .catch(error => done(error));
            })
            .catch(error => Cli.x(`could not fetch project.`, error))
            .then(() => resolve());
    }))
    .then(() => Cli.mark())
    .catch(error => Cli.x(`Could not resolve "${projectLabels}"`, error))

    // get issues
    .then(() => new Promise(resolve => {
        if (!config.get('query').includes('issues')) return resolve();

        Cli.list(`${Cli.fetch}  Fetching issues`);

        reports
            .forEach((report, done) => {
                report.getIssues()
                    .then(() => done());
            })
            .catch(error => Cli.x(`could not fetch issues.`, error))
            .then(() => Cli.mark())
            .then(() => resolve());
    }))

    // get merge requests
    .then(() => new Promise(resolve => {
        if (!config.get('query').includes('merge_requests')) return resolve();

        Cli.list(`${Cli.fetch}  Fetching merge requests`);

        reports
            .forEach((report, done) => {
                report.getMergeRequests()
                    .catch(error => done(error))
                    .then(() => done());
            })
            .catch(error => Cli.x(`could not fetch merge requests.`, error))
            .then(() => Cli.mark())
            .then(() => resolve());
    }))

    // merge reports
    .then(() => new Promise(resolve => {
        Cli.list(`${Cli.merge}  Merging reports`);

        reports
            .forEach((report, done) => {
                master.merge(report);
                done();
            })
            .catch(error => Cli.x(`could not merge reports.`, error))
            .then(() => Cli.mark())
            .then(() => resolve());
    }))

    // process issues
    .then(() => new Promise(resolve => {
        if (!config.get('query').includes('issues') || master.issues.length === 0) return resolve();

        Cli.bar(`${Cli.process}️  Processing issues`, master.issues.length);
        master.processIssues(() => Cli.advance())
            .then(() => Cli.mark())
            .catch(error => Cli.x(`could not process issues.`, error))
            .then(() => resolve());
    }))

    // process merge requests
    .then(() => new Promise(resolve => {
        if (!config.get('query').includes('merge_requests') || master.mergeRequests.length === 0) return resolve();

        Cli.bar(`${Cli.process}️️  Processing merge requests`, master.mergeRequests.length);
        master.processMergeRequests(() => Cli.advance())
            .then(() => Cli.mark())
            .catch(error => Cli.x(`could not process merge requests.`, error))
            .then(() => resolve());
    }))

    // make report
    .then(() => new Promise(resolve => {
        if (master.issues.length === 0 && master.mergeRequests.length === 0)
            Cli.error('No issues or merge requests matched your criteria.');

        Cli.list(`${Cli.output}  Making report`);
        output = new Output[config.get('output')](config, master);
        output.make();
        Cli.mark();
        resolve();
    }))
    .catch(error => Cli.x(`could not make report.`, error))

    // print report
    .then(() => new Promise(resolve => {
        Cli.list(`${Cli.print}  Printing report`);
        if (config.get('file')) {
            output.toFile(config.get('file'), resolve);
        } else {
            output.toStdOut();
            resolve();
        }
    }))
    .catch(error => Cli.x(`could not print report.`, error))
    .then(() => Cli.mark())

    // time for a beer
    .then(() => Cli.done());
