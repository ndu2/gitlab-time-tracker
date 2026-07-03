import CoreMergeRequest from '../../core/mergeRequest.js';
import writable from './writable.js';

/**
 * merge request with timekeeping write operation: make() (get-or-create).
 */
class mergeRequest extends writable(CoreMergeRequest) {
    make(project, id, create = false) {
        let promise;

        if (create) {
            promise = this.post(`projects/${encodeURIComponent(project)}/merge_requests`, {title: id});
        } else {
            promise = this.get(`projects/${encodeURIComponent(project)}/merge_requests/${id}`);
        }

        promise.then(issue => {
            this.data = issue.body;
            return promise;
        });

        return promise;
    }
}

export default mergeRequest;
