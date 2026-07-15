import { expect } from 'chai';
import Config from '../../src/core/config.js';
import Args from '../../src/core/args.js';
import { buildReportConfig, validateReportConfig } from '../../src/reporting/reportConfigBuilder.js';

const Output = { table: () => {}, csv: () => {} };

function opts(overrides = {}) {
    return Object.assign({
        url: undefined, token: undefined, from: undefined, to: undefined,
        closed: undefined, user: undefined, milestone: undefined,
        include_by_labels: undefined, exclude_by_labels: undefined,
        include_labels: undefined, exclude_labels: undefined,
        date_format: undefined, time_format: undefined, hours_per_day: undefined,
        output: 'table', file: undefined, query: undefined, report: undefined,
        record_columns: undefined, issue_columns: undefined, merge_request_columns: undefined,
        no_headlines: undefined, no_warnings: undefined, quiet: undefined,
        show_without_times: undefined, user_columns: undefined, type: undefined,
        subgroups: undefined, verbose: undefined,
        invoiceTitle: undefined, invoiceReference: undefined, invoiceText: undefined,
        invoiceAddress: undefined, invoiceCurrency: undefined, invoiceCurrencyPerHour: undefined,
        invoiceVAT: undefined, invoiceDate: undefined, invoiceTimeMaxUnit: undefined,
        invoiceCurrencyMaxUnit: undefined, invoicePositionText: undefined,
        invoicePositionExtra: undefined, invoicePositionExtraText: undefined,
        invoicePositionExtraValue: undefined
    }, overrides);
}

describe('buildReportConfig', () => {
    let config;

    beforeEach(() => {
        config = new Config();
    });

    it('maps plain options onto config', () => {
        buildReportConfig(config, opts({ url: 'https://example.com', token: 'abc', output: 'csv' }), new Args([]));

        expect(config.get('url')).to.equal('https://example.com');
        expect(config.get('token')).to.equal('abc');
        expect(config.get('output')).to.equal('csv');
    });

    it('resolves the project and iids from positional args', () => {
        buildReportConfig(config, opts(), new Args(['group/project', '12', '34']));

        expect(config.get('project')).to.deep.equal(['group/project']);
        expect(config.get('iids')).to.deep.equal(['12', '34']);
    });

    it('applies the --today shortcut over --from/--to', () => {
        buildReportConfig(config, opts({ today: true, from: '2020-01-01', to: '2020-01-02' }), new Args([]));

        expect(config.get('from').format('YYYY-MM-DD')).to.equal(config.get('to').subtract(1, 'day').format('YYYY-MM-DD'));
    });

    it('splits invoicePositionExtraText/Value into arrays, defaulting to a single empty entry', () => {
        buildReportConfig(config, opts(), new Args([]));

        expect(config.get('invoicePositionExtraText')).to.deep.equal(['']);
        expect(config.get('invoicePositionExtraValue')).to.deep.equal(['']);
    });
});

describe('validateReportConfig', () => {
    let config;

    beforeEach(() => {
        config = new Config();
    });

    it('errors when no project is set', () => {
        buildReportConfig(config, opts(), new Args([]));

        const { errors } = validateReportConfig(config, Output);

        expect(errors).to.include('Missing project(s) or group(s) namespace. Try this: gtt report "username/project-name"');
    });

    it('errors when the output backend does not exist', () => {
        buildReportConfig(config, opts({ output: 'nope' }), new Args(['group/project']));

        const { errors } = validateReportConfig(config, Output);

        expect(errors.some(e => e.includes('nope'))).to.be.true;
    });

    it('errors when invoicePositionExtraText/Value lengths do not match', () => {
        buildReportConfig(config, opts({ invoicePositionExtraText: 'a,b', invoicePositionExtraValue: '1' }), new Args(['group/project']));

        const { errors } = validateReportConfig(config, Output);

        expect(errors).to.include('invoicePositionExtraText and invoicePositionExtraValue length do not match');
    });

    it('warns when ids are given but multiple query types are requested', () => {
        buildReportConfig(config, opts({ query: undefined }), new Args(['group/project', '5']));

        const { warnings } = validateReportConfig(config, Output);

        expect(warnings).to.include('The ids argument is ignored when querying issues and merge requests');
    });

    it('passes cleanly for a well-formed project report', () => {
        buildReportConfig(config, opts(), new Args(['group/project']));

        const { errors, warnings } = validateReportConfig(config, Output);

        expect(errors).to.deep.equal([]);
        expect(warnings).to.deep.equal([]);
    });
});
