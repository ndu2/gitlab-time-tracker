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
        if (!this.projectNames.includes(report.project.namespace)) {
            this.projectNames.push(report.project.namespace);
            this.reports.push(report);
        }
    }
}

export default ReportCollection;
