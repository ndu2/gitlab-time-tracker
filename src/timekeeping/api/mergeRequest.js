import CoreTask from '../../core/task.js';
import writable from './writable.js';

/**
 * merge request with timekeeping write operations (make/createTime) provided
 * by the writable mixin; make() targets merge_requests via the _type getter.
 */
class mergeRequest extends writable(CoreTask) {
    constructor(config, data, client) {
        super(config, data, client, 'merge_requests');
    }
}

export default mergeRequest;
