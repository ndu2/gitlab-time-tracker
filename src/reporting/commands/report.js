import fs from 'fs';
import {Command} from 'commander';
import Cli from '../../core/cli.js';
import Args from '../../core/args.js';
import GitlabClient from '../../core/gitlab-client.js';
import {buildReportConfig, validateReportConfig} from '../reportConfigBuilder.js';
import {runReport, Output} from '../reportRunner.js';

// this collects options
function collect(val, arr) {
    if (!arr) arr = [];
    arr.push(val);

    return [...new Set(arr)];
}


function report(configLoader) {
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

let config = buildReportConfig(configLoader(), program.opts(), new Args(program.args));

Cli.quiet = config.get('quiet');
Cli.verbose = config.get('_verbose');

let {errors, warnings} = validateReportConfig(config, Output);
warnings.forEach(warning => Cli.warn(warning));
if (errors.length > 0) Cli.error(errors[0]);

// file prompt
if (config.get('file') && fs.existsSync(config.get('file'))) {
    try {
        await Cli.ask(`The file "${config.get('file')}" already exists. Overwrite?`);
    } catch (error) {
        Cli.error(`can't write file.`, error);
    }
}

let client = new GitlabClient(config);
let output = await runReport(config, client, Cli);

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
