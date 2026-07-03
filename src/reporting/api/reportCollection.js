import GitlabClient from '../../core/gitlab-client.js';
let projlist = [];

class reportCollection extends GitlabClient {
    constructor(config) {
        super(config);

        this.reports = [];
    }

    forEach(iterator) {
        return this.parallel(this.reports, (report, done) => iterator(report, done));
    }

    push(report) {
        if (projlist.indexOf(report.project.name) === -1) {
            projlist.push(report.project.name);
            this.reports.push(report);
        }
    }
    get length() {
        return this.reports.length;
    }
}

export default reportCollection;
