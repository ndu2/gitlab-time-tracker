import CoreIssue from '../../core/issue.js';
import reportable from './reportable.js';

/**
 * issue with reporting read/aggregation (getStats, getTimes, recordTimelogs).
 */
class issue extends reportable(CoreIssue) {}

export default issue;
