import dayjs from '../core/dayjs.js';

/**
 * Apply report command options and positional args onto config, including
 * the --today/--this_week/--this_month/--last_month date shortcuts.
 * @param {import('../core/config.js').default} config
 * @param opts commander's program.opts()
 * @param args Args instance built from program.args
 * @returns {import('../core/config.js').default}
 */
export function buildReportConfig(config, opts, args) {
    config
        .set('url', opts.url)
        .set('token', opts.token)
        .set('project', args.project())
        .set('iids', args.iids())
        .set('from', opts.from)
        .set('to', opts.to)
        .set('closed', opts.closed)
        .set('user', opts.user)
        .set('milestone', opts.milestone)
        .set('includeByLabels', opts.include_by_labels)
        .set('excludeByLabels', opts.exclude_by_labels)
        .set('includeLabels', opts.include_labels)
        .set('excludeLabels', opts.exclude_labels)
        .set('dateFormat', opts.date_format)
        .set('timeFormat', opts.time_format)
        .set('hoursPerDay', opts.hours_per_day)
        .set('output', opts.output)
        .set('file', opts.file)
        .set('query', opts.query)
        .set('report', opts.report)
        .set('recordColumns', opts.record_columns)
        .set('issueColumns', opts.issue_columns)
        .set('mergeRequestColumns', opts.merge_request_columns)
        .set('noHeadlines', opts.no_headlines)
        .set('noWarnings', opts.no_warnings)
        .set('quiet', opts.quiet)
        .set('showWithoutTimes', opts.show_without_times)
        .set('userColumns', opts.user_columns)
        .set('type', opts.type)
        .set('subgroups', opts.subgroups)
        .set('_verbose', opts.verbose)
        .set('invoiceTitle', opts.invoiceTitle)
        .set('invoiceReference', opts.invoiceReference)
        .set('invoiceText', opts.invoiceText)
        .set('invoiceAddress', opts.invoiceAddress)
        .set('invoiceCurrency', opts.invoiceCurrency)
        .set('invoiceCurrencyPerHour', opts.invoiceCurrencyPerHour)
        .set('invoiceVAT', opts.invoiceVAT)
        .set('invoiceDate', opts.invoiceDate)
        .set('invoiceTimeMaxUnit', opts.invoiceTimeMaxUnit)
        .set('invoiceCurrencyMaxUnit', opts.invoiceCurrencyMaxUnit)
        .set('invoicePositionText', opts.invoicePositionText)
        .set('invoicePositionExtra', opts.invoicePositionExtra)
        .set('invoicePositionExtraText', (opts.invoicePositionExtraText ? opts.invoicePositionExtraText : '').split(','))
        .set('invoicePositionExtraValue', (opts.invoicePositionExtraValue ? opts.invoicePositionExtraValue : '').split(','));

    if (opts.today)
        config
            .set('from', dayjs().startOf('day'))
            .set('to', dayjs().add(1, 'day').startOf('day'));
    if (opts.this_week)
        config
            .set('from', dayjs().startOf('week'))
            .set('to', dayjs().endOf('week').add(1, 'day').startOf('day'));
    if (opts.last_week)
        config
            .set('from', dayjs().startOf('week').subtract(1, 'week'))
            .set('to', dayjs().endOf('week').subtract(1, 'week').add(1, 'day').startOf('day'));
    if (opts.this_month)
        config
            .set('from', dayjs().startOf('month'))
            .set('to', dayjs().endOf('month').add(1, 'day').startOf('day'));
    if (opts.last_month)
        config
            .set('from', dayjs().subtract(1, 'months').startOf('month'))
            .set('to', dayjs().subtract(1, 'months').endOf('month').add(1, 'day').startOf('day'));

    return config;
}

/**
 * Validate a report config, built by buildReportConfig, against the
 * available output backends. Pure - returns messages instead of printing
 * or exiting so callers decide how to surface them.
 * @param config
 * @param Output map of output name -> loader, e.g. {table: () => import(...)}
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validateReportConfig(config, Output) {
    let errors = [];
    let warnings = [];
    let projects = Array.isArray(config.get('project')) ? config.get('project') : [config.get('project')];

    if (config.get('invoicePositionExtraText').length != config.get('invoicePositionExtraValue').length) {
        errors.push(`invoicePositionExtraText and invoicePositionExtraValue length do not match`);
    }
    if (config.get('iids').length >= 1 && config.get('query').length > 1) {
        warnings.push(`The ids argument is ignored when querying issues and merge requests`);
    }
    if (config.get('iids').length >= 1 && (config.get('type') !== 'project' || projects.length > 1)) {
        warnings.push(`The ids argument is ignored when querying multiple projects`);
    }
    if (config.get('report').includes('issues') && !config.get('query').includes('issues')) {
        warnings.push(`Issues are included in the report but not queried.`);
    }
    if (config.get('report').includes('merge_requests') && !config.get('query').includes('merge_requests')) {
        warnings.push(`Merge Requests are included in the report but not queried.`);
    }
    if (!config.get('project')) {
        errors.push(`Missing project(s) or group(s) namespace. Try this: gtt report "username/project-name"`);
    }
    if (!Output[config.get('output')]) {
        errors.push(`The output ${config.get('output')} doesn't exist. Available outputs: ${Object.keys(Output).join(',')}`);
    }
    if (!config.get('from').isValid()) {
        errors.push(`FROM is not in a valid ISO date format.`);
    }
    if (!config.get('to').isValid()) {
        errors.push(`TO is not a in valid ISO date format.`);
    }

    return { errors, warnings };
}
