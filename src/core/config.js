import dayjs from './dayjs.js';
import Time from './time.js';

const dates = ['from', 'to'];
const objectsWithDefaults = ['timeFormat', 'columns'];
const defaults = {
    type: 'project',
    subgroups: false,
    url: 'https://gitlab.com/api/v4',
    token: false,
    project: false,
    from: "1970-01-01",
    to: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    iids: false,
    closed: false,
    milestone: false,
    hoursPerDay: 8,
    daysPerWeek: 5,
    weeksPerMonth: 4,
    issueColumns: ['iid', 'title', 'spent', 'total_estimate'],
    mergeRequestColumns: ['iid', 'title', 'spent', 'total_estimate'],
    recordColumns: ['user', 'date', 'project', 'type', 'iid', 'title', 'time', 'note'],
    userColumns: false,
    dateFormat: 'DD.MM.YYYY HH:mm:ss',
    timeFormat: Time.defaultTimeFormat,
    output: 'table',
    excludeByLabels: false,
    includeByLabels: false,
    includeLabels: false,
    excludeLabels: false,
    query: ['issues', 'merge_requests'],
    report: ['stats', 'issues', 'merge_requests', 'records'],
    noHeadlines: false,
    noWarnings: false,
    quiet: false,
    showWithoutTimes: false,
    timezone: "UTC",
    _perPage: 100,
    _parallel: 10,
    _verbose: false,
    _checkToken: true,
    _skipDescriptionParsing: false,
    throttleMaxRequestsPerInterval: 10,
    throttleInterval: 1000,
    frameDir: undefined,
};

/**
 * basic config
 */
class Config {
    /**
     * construct
     */
    constructor() {
        this.data = {...defaults};
    }

    /**
     * set a value by the given key.
     * it won't get set if the value is null or undefined. you can force
     * setting the value by passing true as third parameter.
     * @param key
     * @param value
     * @param force
     * @returns {Config}
     */
    set(key, value, force = false) {
        if (!force && (value === null || value === undefined)) return this;

        this.data[key] = value;

        return this;
    }

    /**
     * get a value by the given key
     * @param key
     * @param subKey
     * @returns {*}
     */
    get(key, subKey = false) {
        if (dates.includes(key))
            return dayjs(this.data[key]);

        if (objectsWithDefaults.includes(key) && typeof this.data[key] === 'object' && this.data[key] !== null)
            return subKey && this.data[key][subKey] ? this.data[key][subKey] : defaults[key];

        return this.data[key];
    }

    /**
     * get a human readable version of the given time
     * @param input
     * @param timeFormat
     * @returns {string}
     */
    toHumanReadable(input, timeFormat = false) {
        return Time.toHumanReadable(input, this.get('hoursPerDay'), this.get('timeFormat', timeFormat));
    }
}

export default Config;
