import parallel from '../../core/parallel.js';

class ReportCollection {
    constructor(config) {
        this.config = config;

        this.reports = [];
        this.projectNames = [];
    }

    forEach(iterator) {
        return parallel(this.reports, iterator, this.config);
    }

    push(report) {
        if (!this.projectNames.includes(report.project.name)) {
            this.projectNames.push(report.project.name);
            this.reports.push(report);
        }
    }
    get length() {
        return this.reports.length;
    }
}

export default ReportCollection;
