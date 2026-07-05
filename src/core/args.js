/**
 * Args helper
 */
class Args {
    constructor(args) {
        this.args = args;
        this.data = [];
    }

    /**
     * parse the args and return the project argument
     * @returns {*}
     */
    project() {
        if (!this.args[0] && !this.data.project) return null;

        if (this.data.project) return this.data.project;

        let projects = [...new Set(this.args.filter(arg => isNaN(new Number(arg))))];
        this.args = this.args.filter(arg => !projects.includes(arg));

        if(projects.length == 0)
            return null;

        return this.data.project = projects;
    }

    /**
     * parse the args and return an array of issues
     * @returns {*}
     */
    iids() {
        if (this.data.iids) return this.data.iids;

        this.data.iids = [...new Set(this.args.map((issue) => {
            if (issue.indexOf(',') === -1) return issue;
            return issue.split(',');
        }).flat())];

        if (this.data.iids.length === 0) return null;

        return this.data.iids;
    }
}

export default Args;
