import Time from '../../core/time.js';

/**
 * mixin: adds the timekeeping write operation createTime() — posts a
 * "/spend" note to the resource's GitLab issue/merge request.
 * @param Base a core issue/mergeRequest class
 */
export default Base => class extends Base {
    /**
     * create time
     * @param time
     * @returns {*}
     */
    createTime(time, created_at, note) {
        if(note === null || note === undefined) {
            note = '';
        }
        else {
            note = '\n\n' + note;
        }
        var date = new Date(created_at);
        var spentAt = date.getUTCFullYear()+"-"+(date.getUTCMonth()+1)+"-"+date.getUTCDate();
        return this.post(`projects/${this.data.project_id}/${this._type}/${this.iid}/notes`, {
            body: '/spend '+Time.toHumanReadable(time, this.config.get('hoursPerDay'), '[%sign][%days>d ][%hours>h ][%minutes>m ][%seconds>s]'+' '+spentAt + note),
        });
    }
};
