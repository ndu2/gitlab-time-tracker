import CoreIssue from '../../core/issue.js';
import writable from './writable.js';

/**
 * issue with timekeeping write operations: make() (get-or-create) and list().
 */
class issue extends writable(CoreIssue) {
    make(project, id, create = false) {
        let promise;

        if (create) {
            promise = this.post(`projects/${encodeURIComponent(project)}/issues`, {title: id});
        } else {
            promise = this.get(`projects/${encodeURIComponent(project)}/issues/${id}`);
        }

        promise.then(issue => {
            this.data = issue.body;
            return promise;
        });

        return promise;
    }

    list(project, state, my) {
      return new Promise((resolve, reject) => {
        let promise;
        const query = `scope=${my ? "assigned-to-me" : "all"}&state=${state}`;
        if (project) {
          promise = this.get(`projects/${encodeURIComponent(project)}/issues?${query}`);
        } else {
          promise = this.get(`issues/?${query}`);
        }
        promise.then(response => {
          const issues = response.body.map(issue => new this.constructor(this.config, issue))
          resolve(issues)
        });
        promise.catch(error => reject(error))
      })
    }
}

export default issue;
