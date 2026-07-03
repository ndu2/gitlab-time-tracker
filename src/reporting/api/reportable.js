import _ from 'underscore';
import moment from 'moment';
import Time from '../../core/time.js';
import DayReport from './dayReport.js';

const regex = /added (.*) of time spent(?: at ([0-9-]*))?/i;
const subRegex = /subtracted (.*) of time spent(?: at ([0-9-]*))?/i;
const delRegex = /deleted (.*) of spent time(?: from ([0-9-]*))?/i;
const removeRegex = /Removed time spent/i;

/**
 * mixin: adds reporting read/aggregation to a core issue/mergeRequest class.
 * @param Base a core issue/mergeRequest class
 */
export default Base => class extends Base {
    /**
     * set stats
     * @returns {Promise}
     */
    getStats() {
        let promise = this.get(`projects/${this.data.project_id}/${this._type}/${this.iid}/time_stats`);
        promise.then(response => this.stats = response.body);

        return promise;
    }

    recordTimelogs(timelogs){

      let spentFreeLabels = this.config.get('freeLabels');
      if(undefined === spentFreeLabels) {
          spentFreeLabels = [];
      }
      let spentHalfPriceLabels = this.config.get('halfPriceLabels');
      if(undefined === spentHalfPriceLabels) {
          spentHalfPriceLabels = [];
      }

      let free = false;
      let halfPrice = false;
      this.labels.forEach(label => {
              spentFreeLabels.forEach(freeLabel => {
                  free |= (freeLabel == label);
              });
          });
      this.labels.forEach(label => {
              spentHalfPriceLabels.forEach(halfPriceLabel => {
                  halfPrice |= (halfPriceLabel == label);
              });
          });


      let chargeRatio = free? 0.0: (halfPrice? 0.5: 1.0);



        timelogs.forEach(
            (timelog) => {
                let spentAt = moment(timelog.spentAt);
                let dateGrp = spentAt.format(this.config.get('dateFormatGroupReport'));
                if(!this.days[dateGrp])
                {
                    this.days[dateGrp] = new DayReport(this.iid, this.title, spentAt, chargeRatio);
                }
                if(timelog.note && timelog.note.body) {
                    this.days[dateGrp].addNote(timelog.note.body);
                }
                this.days[dateGrp].addSpent(timelog.timeSpent);
            });
    }

    /**
     * set times (call set notes first)
     * @returns {Promise}
     */
    getTimes() {
        let times = [],
            timesWarnings = [],
            timeSpent = 0,
            totalTimeSpent = 0,
            timeUsers = {},
            timeFormat = this.config.get('timeFormat', this._type);

        // sort by created at
        this.notes.sort((a, b) => {
            if (a.created_at === b.created_at) return 0;
            return moment(a.created_at).isBefore(b.created_at) ? -1 : 1;
        });

        let promise = this.parallel(this.notes, (note, done) => {
            let created = moment(note.created_at), match, subMatch, delMatch;

            if ( //
            // filter out user notes
            !note.system ||
            // filter out notes that are no time things
            !(match = regex.exec(note.body)) && !(subMatch = subRegex.exec(note.body)) && !removeRegex.exec(note.body) && !(delMatch = delRegex.exec(note.body))
            ) return done();

            // change created date when explicitly defined
            if(match && match[2]) created = moment(match[2]);
            if(subMatch && subMatch[2]) created = moment(subMatch[2]);
            if(delMatch && delMatch[2]) created = moment(delMatch[2]);

            // create a time string and a time object
            let timeString = null;
            let multiplier = 1;
            if(match) {
                timeString = match[1];
            }
            else if(subMatch) {
                timeString = subMatch[1];
                multiplier = -1;
            }
            else if(delMatch){
                timeString = delMatch[1];
                multiplier = -1;;
            }
            else {
                // Removed time spent -> remove all
                timeString = Time.toHumanReadable(timeSpent);
                multiplier = -1;
            }

            let time = new Time(null, created, note, this, this.config);
            time.seconds = Time.parse(timeString, 8, 5, 4) * multiplier;


            // add to total time spent
            totalTimeSpent += time.seconds;

            if ( //
            // only include times by the configured user
            (this.config.get('user') && this.config.get('user') !== note.author.username) ||
            // filter out times that are not in the given time frame
            !(created.isSameOrAfter(moment(this.config.get('from'))) && created.isSameOrBefore(moment(this.config.get('to'))))
            ) return done();

            if (!timeUsers[note.author.username]) timeUsers[note.author.username] = 0;

            // add to time spent & add to user specific time spent
            timeSpent += time.seconds;
            timeUsers[note.author.username] += time.seconds;

            time.project_namespace = this.project_namespace;
            times.push(time);

            done();
        });

        promise = promise.then(() => new Promise(resolve => {
            let created = moment(this.data.created_at);

            if ( //
            // skip if description parsing is disabled
            this.config.get('_skipDescriptionParsing') ||
            // or time stats are not available
            !this.data.time_stats || !this.data.time_stats.total_time_spent ||
            // or the total time matches
            !this.data.time_stats ||
            totalTimeSpent === this.data.time_stats.total_time_spent ||
            // or the user is filtered out
            (this.config.get('user') && this.config.get('user') !== this.data.author.username) ||
            // or the issue is not within the given time frame
            !(created.isSameOrAfter(moment(this.config.get('from'))) && created.isSameOrBefore(moment(this.config.get('to'))))
            ) return resolve();

            // warn about difference, but do not correct as gitlab API
            // stats forget the times after an issue is moved to another project.
            let difference = this.data.time_stats.total_time_spent - totalTimeSpent,
                note = Object.assign({noteable_type: this._typeSingular}, this.data);
            note.timeWarning = {};
            note.timeWarning['stats'] = this.data.time_stats.total_time_spent;
            note.timeWarning['notes'] = totalTimeSpent;
            timesWarnings.push(new Time(Time.toHumanReadable(difference, this.config.get('hoursPerDay')), null, note, this, this.config));
            resolve();
        }));

        promise.then(() => {
            _.each(timeUsers, (time, name) => this[`time_${name}`] = Time.toHumanReadable(time, this.config.get('hoursPerDay'), timeFormat));
            this.timeSpent = timeSpent;
            this.times = times;
            this.timesWarnings = timesWarnings;
        });

        return promise;
    }
};
