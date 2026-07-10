/**
 * Items (issues or merge requests) that carry none of the given
 * excluded labels. Pure - replaces the raw-label filter that used to
 * live inline in Report.getIssues/getMergeRequests.
 * @param items raw GitLab issue/merge request objects (have .labels)
 * @param excludeLabels array of label names, or falsy for "exclude nothing"
 * @returns {Array}
 */
export function excludeByLabel(items, excludeLabels) {
    if (!excludeLabels) return items;

    return items.filter(item => excludeLabels.filter(label => item.labels.includes(label)).length === 0);
}

/**
 * Issues that have not been moved to another project.
 * @param issues raw GitLab issue objects (have .moved_to_id)
 * @returns {Array}
 */
export function excludeMoved(issues) {
    return issues.filter(issue => issue.moved_to_id == null);
}
