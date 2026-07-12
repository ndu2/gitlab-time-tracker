import dayjs from './dayjs.js';

const defaultTimeFormat = '[%sign][%days>d ][%hours>h ][%minutes>m ][%seconds>s]';
const conditionalRegex = /(\[\%([^\>\]]*)\>([^\]]*)\])/ig;
const roundedRegex = /(\[\%([^\>\]]*)\:([^\]]*)\])/ig;
const conditionalSimpleRegex = /([0-9]*)\>(.*)/ig;
const defaultRegex = /(\[\%([^\]]*)\])/ig;

function padLeft(value, n, str) {
    return Array(Math.max(0, n - String(value).length + 1)).join(str || '0') + value;
}

/**
 * time model
 */
class Time {
    /**
     * construct
     * @param date
     * @param data raw noteable payload (author, created_at, noteable_type)
     * @param config
     * @param {number} seconds
     * @param {string|null} [note]
     * @param {number} [chargeRatio]
     */
    constructor(date = null, data, config, seconds, note = null, chargeRatio = 1.0) {
        this.data = data;
        this._date = date;
        this.config = config;
        this.note = note;
        this.chargeRatio = chargeRatio;
        this.seconds = seconds;
    }

    /*
     * properties
     */
    static get defaultTimeFormat() {
        return defaultTimeFormat;
    }

    get user() {
        return this.data.author.username;
    }

    get date() {
        return this._date ? dayjs(this._date) : dayjs(this.data.created_at);
    }

    get type() {
        return this.data.noteable_type;
    }

    get time() {
        return Time.toHumanReadable(this.seconds, this._hoursPerDay, this._timeFormat);
    }

    get _timeFormat() {
        return this.config && this.config.get('timeFormat', 'records') ? this.config.get('timeFormat', 'records') : '';
    }

    get _hoursPerDay() {
        return this.config && this.config.get('hoursPerDay') ? parseInt(this.config.get('hoursPerDay')) : 8;
    }

    get _daysPerWeek() {
        return this.config && this.config.get('daysPerWeek') ? parseInt(this.config.get('daysPerWeek')) : 5;
    }

    get _weeksPerMonth() {
        return this.config && this.config.get('weeksPerMonth') ? parseInt(this.config.get('weeksPerMonth')) : 4;
    }

    /**
     * get human readable
     * @param input
     * @param hoursPerDay
     * @param format
     * @returns {string}
     */
    static toHumanReadable(input, hoursPerDay = 8, format = Time.defaultTimeFormat) {
        let sign = parseInt(input) < 0 ? '-' : '', output = format, match;
        input = Math.abs(input);

        let secondsInADay = 60 * 60 * hoursPerDay;
        let secondsInAnHour = 60 * 60;
        let secondsInAMinute = 60;

        let inserts = {};

        inserts.sign = sign;
        inserts.days_overall = input / secondsInADay;
        inserts.days_overall_comma = inserts.days_overall.toString().replace('.', ',');
        inserts.days = Math.floor(inserts.days_overall);
        inserts.Days = padLeft(inserts.days, 2, '0');
        inserts.hours_overall = input / secondsInAnHour;
        inserts.hours_overall_comma = inserts.hours_overall.toString().replace('.', ',');
        inserts.hours = Math.floor((input % secondsInADay) / secondsInAnHour);
        inserts.Hours = padLeft(inserts.hours, 2, '0');
        inserts.minutes_overall = input / secondsInAMinute;
        inserts.minutes_overall_comma = (inserts.minutes_overall).toString().replace('.', ',');
        inserts.minutes = Math.floor(((input % secondsInADay) % secondsInAnHour) / secondsInAMinute);
        inserts.Minutes = padLeft(inserts.minutes, 2, '0');
        inserts.seconds_overall = input;
        inserts.seconds = ((input % secondsInADay) % secondsInAnHour) % secondsInAMinute;
        inserts.Seconds = padLeft(inserts.seconds, 2, '0');

        // rounded
        while ((match = roundedRegex.exec(format)) !== null) {
            if (match.index === roundedRegex.lastIndex) roundedRegex.lastIndex++;
            let time, conditionalMatch, decimals = match[3];

            if ((conditionalMatch = conditionalSimpleRegex.exec(decimals)) !== null) {
                decimals = conditionalMatch[1]
            }

            let iDecimals = parseInt(decimals);
            time = Math.ceil(inserts[match[2]] * Math.pow(10, iDecimals)) / Math.pow(10, iDecimals);
            output = output.replace(match[0], (time !== 0 && conditionalMatch ? time + conditionalMatch[2] : time).toString());
        }

        // conditionals
        while ((match = conditionalRegex.exec(format)) !== null) {
            if (match.index === conditionalRegex.lastIndex) conditionalRegex.lastIndex++;
            output = output.replace(match[0], inserts[match[2]] > 0 ? inserts[match[2]] + match[3] : '');
        }

        // default
        format = output;
        while ((match = defaultRegex.exec(format)) !== null) {
            if (match.index === defaultRegex.lastIndex) defaultRegex.lastIndex++;
            output = output.replace(match[0], inserts[match[2]]);
        }

        return output.trim();
    }
}

export default Time;
