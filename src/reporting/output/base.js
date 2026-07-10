import fs from 'fs';
import dayjs from '../../core/dayjs.js';
import calculateStats from '../stats.js';

const defaultFormats = {
    headline: h => `${h}\n`,
    warning: w => w,
    write: w => `\n${w}`
};

/**
 * Base output renderer: renders a report aggregated by calculateStats and
 * exposes write/headline/toStdOut/toFile. Root of the output-format hierarchy.
 */
class Output {
    // assigned in the constructor via Object.assign(this, calculateStats(...))
    /** @type {Array} */ times;
    /** @type {Object} */ days;
    /** @type {Object} */ daysMoment;
    /** @type {Object} */ daysNew;
    /** @type {Object<string,string>} */ users;
    /** @type {Object<string,string>} */ projects;
    /** @type {Object<string,string>} */ stats;
    /** @type {number} */ totalEstimate;
    /** @type {number} */ totalSpent;
    /** @type {number} */ spent;
    /** @type {number} */ spentFree;
    /** @type {number} */ spentHalfPrice;

    /**
     * constructor
     * @param config
     * @param report
     */
    constructor(config, report) {
        this.config = config;
        this.report = report;
        this.out = '';
        this.formats = defaultFormats;
        Object.assign(this, calculateStats(config, report));
    }

    set format(value) {
        this.formats = Object.assign(this.formats, value);
    }

    // implemented by each output format (table/csv/markdown/invoice)
    makeStats() {}
    makeIssues() {}
    makeMergeRequests() {}
    makeRecords() {}

    /**
     * print a headline
     * @param string
     */
    headline(string) {
        if (this.config.get('noHeadlines')) return;
        this.write(this.formats.headline(string));
    }

    /**
     * print a headline for warnings
     * @param string
     */
    warningHeadline(string) {
        if (this.config.get('noWarnings')) return;
        this.headline(string);
    }
    /**
     * print a warning
     * @param string
     */
    warning(string) {
        if (this.config.get('noWarnings')) return;
        this.write(this.formats.warning(string));
    }

    /**
     * add the given string
     * @param string
     * @returns {Output}
     */
    write(string) {
        this.out += this.formats.write(string);
        return this;
    }

    /**
     * make
     */
    make() {
        if (this.config.get('report').includes('stats')) {
            this.makeStats();
        }

        if (this.config.get('report').includes('issues')) {
            this.makeIssues();
        }

        if (this.config.get('report').includes('merge_requests')) {
            this.makeMergeRequests();
        }

        if (this.config.get('report').includes('records')) {
            this.makeRecords();
        }
    }

    /**
     * render to stdout
     */
    toStdOut() {
        process.stdout.write(`${this.out}\n`);
    }

    /**
     * render to file
     */
    toFile(file, resolve) {
        fs.writeFileSync(file, this.out);
        if (resolve) resolve();
    }

    /**
     * prepare the given object by only returning
     * the given columns/properties and formatting
     * special properties like dayjs instances
     * @param obj
     * @param columns
     * @returns {Array}
     */
    prepare(obj = {}, columns = []) {
        return columns.map(column => {
            if (dayjs.isDayjs(obj[column]))
                return obj[column].format(this.config.get('dateFormat'));

            if (obj[column] === undefined || obj[column] === null)
                return '';

            if(typeof obj[column] == 'object') {
                return obj[column].toString()
            }
            return obj[column];
        });
    }
}

export default Output;