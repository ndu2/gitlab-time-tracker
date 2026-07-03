import CoreMergeRequest from '../../core/mergeRequest.js';
import reportable from './reportable.js';

/**
 * merge request with reporting read/aggregation (getStats, getTimes, recordTimelogs).
 */
class mergeRequest extends reportable(CoreMergeRequest) {}

export default mergeRequest;
