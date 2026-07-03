import _ from 'underscore';
import moment from 'moment';
import Time from '../../core/time.js';
import DayReport from './dayReport.js';

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
        let promise = this.client.get(`projects/${this.data.project_id}/${this._type}/${this.iid}/time_stats`);
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

        let times = [],
            timeSpent = 0,
            timeUsers = {},
            timeFormat = this.config.get('timeFormat', this._type);

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

                let time = new Time(null, spentAt, {
                    author: {username: timelog.user.username},
                    created_at: timelog.spentAt,
                    noteable_type: this._typeSingular
                }, this, this.config);
                time.seconds = timelog.timeSpent;
                time.project_namespace = this.project_namespace;

                // only include times by the configured user
                if (this.config.get('user') && this.config.get('user') !== timelog.user.username) return;

                if (!timeUsers[timelog.user.username]) timeUsers[timelog.user.username] = 0;

                timeSpent += time.seconds;
                timeUsers[timelog.user.username] += time.seconds;

                times.push(time);
            });

        _.each(timeUsers, (time, name) => this[`time_${name}`] = Time.toHumanReadable(time, this.config.get('hoursPerDay'), timeFormat));
        this.timeSpent = timeSpent;
        this.times = times;
    }
};
