import DayReport from './api/dayReport.js';

/**
 * Aggregate a merged report into the numbers the output formats render:
 * per-user/per-project/per-day spent time, estimate and spent totals,
 * free and half-price time by label, and the flat, date-sorted list of
 * time records.
 *
 * Note: sorts report.issues and report.mergeRequests in place (newest
 * iid first) as part of preparing the report for rendering.
 *
 * @param config
 * @param report merged report with issues and mergeRequests
 * @returns {Object} calculated fields, ready to assign to an output
 */
export default function calculateStats(config, report) {
    let totalEstimate = 0;
    let totalSpent = 0;
    let spent = 0;
    let spentFree = 0;
    let spentHalfPrice = 0;
    let users = {};
    let projects = {};
    let times = [];
    let days = {};
    let daysMoment = {};
    let daysNew = {};

    ['issues', 'mergeRequests'].forEach(type => {
        report[type].forEach(issue => {
            // consolidate all issues back in one day
            let issueDays = {};

            issue.times.forEach(time => {
                let dateGrp = time.date.format(config.get('dateFormatGroupReport'));

                if (!issueDays[dateGrp]) {
                    issueDays[dateGrp] = new DayReport(issue.project_id, issue.iid, issue.title, time.date, time.chargeRatio);
                    if (!daysNew[dateGrp]) {
                        daysNew[dateGrp] = [];
                    }
                    daysNew[dateGrp].push(issueDays[dateGrp]);
                }
                if (time.note) {
                    issueDays[dateGrp].addNote(time.note);
                }
                issueDays[dateGrp].addSpent(time.seconds);

                if (!users[time.user]) users[time.user] = 0;
                if (!projects[time.project_namespace]) projects[time.project_namespace] = 0;
                if (!days[dateGrp]) {
                    days[dateGrp] = {};
                    daysMoment[dateGrp] = time.date;
                }
                if (!days[dateGrp][time.project_namespace]) {
                    days[dateGrp][time.project_namespace] = {};
                }
                if (!days[dateGrp][time.project_namespace][time.iid]) {
                    days[dateGrp][time.project_namespace][time.iid] = 0;
                }

                users[time.user] += time.seconds;
                projects[time.project_namespace] += time.seconds;
                days[dateGrp][time.project_namespace][time.iid] += time.seconds;

                spent += time.seconds;

                if (time.chargeRatio === 0) {
                    spentFree += time.seconds;
                }
                if (time.chargeRatio === 0.5) {
                    spentHalfPrice += time.seconds;
                }
                times.push(time);
            });
            totalEstimate += parseFloat(issue.total_estimate_s);
            totalSpent += parseFloat(issue.total_spent_s);
        });

        report[type].sort((a, b) => {
            if (a.iid === b.iid) return 0;

            return (a.iid - b.iid) < 0 ? 1 : -1;
        });
    });

    times.sort((a, b) => {
        if (a.date.isSame(b.date)) return 0;

        return a.date.isBefore(b.date) ? 1 : -1;
    });

    return {
        times,
        days,
        daysMoment,
        daysNew,
        users: Object.fromEntries(Object.entries(users).map(([name, user]) => [name, config.toHumanReadable(user, 'stats')])),
        projects: Object.fromEntries(Object.entries(projects).map(([name, project]) => [name, config.toHumanReadable(project, 'stats')])),
        stats: {
            'total estimate': config.toHumanReadable(totalEstimate, 'stats'),
            'total spent': config.toHumanReadable(totalSpent, 'stats'),
            'spent': config.toHumanReadable(spent, 'stats'),
            'spent free': config.toHumanReadable(spentFree, 'stats'),
        },
        totalEstimate,
        totalSpent,
        spent,
        spentFree,
        spentHalfPrice,
    };
}
