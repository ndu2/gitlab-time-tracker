import CoreTask from '../../core/task.js';
import reportable from './reportable.js';

/**
 * merge request with reporting read/aggregation (getStats, recordTimelogs).
 */
class mergeRequest extends reportable(CoreTask) {
    constructor(config, data, client) {
        super(config, data, client, 'merge_requests');
    }
}

export default mergeRequest;
