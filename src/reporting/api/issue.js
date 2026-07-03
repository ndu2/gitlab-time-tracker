import CoreTask from '../../core/task.js';
import reportable from './reportable.js';

/**
 * issue with reporting read/aggregation (getStats, recordTimelogs).
 */
class issue extends reportable(CoreTask) {
    constructor(config, data, client) {
        super(config, data, client, 'issues');
    }
}

export default issue;
