/**
 * Fetch every timelog for a project in [from, to), paginating through
 * GitLab's GraphQL API with a plain await loop - no recursion, no polling.
 * @param client GitlabClient (or anything with a graphQL(request) method)
 * @param projectPath full path, e.g. "group/project"
 * @param from dayjs
 * @param to dayjs
 * @returns {Promise<Array>} flat array of timelog nodes, in page order
 */
export default async function fetchTimelogs(client, projectPath, from, to) {
    let timelogs = [];
    let cursor = '';
    let hasNextPage = true;

    while (hasNextPage) {
        const response = await client.graphQL(timelogQuery(projectPath, cursor, from, to));

        if (response.body.errors) return [];

        const page = response.body.data?.project?.timelogs;
        if (!page || !page.nodes) return [];

        timelogs.push(...page.nodes);
        hasNextPage = page.pageInfo.hasNextPage;
        cursor = page.pageInfo.endCursor;
    }

    return timelogs;
}

function timelogQuery(projectPath, cursor, from, to) {
    const query = `
    query ($project: ID!, $after: String, $entryPerPage: Int,
        $startTime:Time, $endTime:Time){
          project(fullPath: $project) {
            name
            timelogs(startTime: $startTime, endTime: $endTime,
              first:$entryPerPage, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                user {
                  username
                }
                spentAt
                timeSpent
                summary
                note {
                  body
                  url
                }
                mergeRequests:mergeRequest {
                  iid
                  projectId
                  title
                }
                issues:issue {
                  iid
                  projectId
                  title
                }
                project {
                  id
                  name
                }
              }
            }
          }
        }
        `;

    return {
        query,
        variables: {
            project: projectPath,
            after: cursor,
            entryPerPage: 30,
            startTime: from.format('YYYY-M-D'),
            endTime: to.format('YYYY-M-D')
        }
    };
}

/**
 * Timelogs belonging to the given issue/merge request. Pure - replaces the
 * raw-shape join that used to live inline in Report.process().
 * @param timelogs flat array from fetchTimelogs
 * @param input 'issues' or 'mergeRequests'
 * @param data the issue/merge request's raw GitLab data (iid, project_id)
 * @returns {Array}
 */
export function timelogsFor(timelogs, input, data) {
    return timelogs.filter(timelog =>
        timelog[input] &&
        timelog[input].iid == data.iid &&
        timelog[input].projectId == data.project_id
    );
}
