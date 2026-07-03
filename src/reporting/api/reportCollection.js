import parallel from '../../core/parallel.js';
let projlist = [];

class reportCollection {
    constructor(config) {
        this.config = config;

        this.reports = [];
    }

    forEach(iterator) {
        return parallel(this.reports, (report, done) => iterator(report, done), this.config);
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
