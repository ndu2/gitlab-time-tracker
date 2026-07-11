import pc from 'picocolors';
import Cli from '../core/cli.js';
import Owner from '../core/owner.js';
import Project from './api/project.js';
import ProjectReport from './api/projectReport.js';
import MasterReport from './api/masterReport.js';
import ReportCollection from './api/reportCollection.js';
import parallel from '../core/parallel.js';

// output backends are imported lazily so timekeeping commands never pull in
// the heavy deps (swissqrbill, markdown-table, csv-string, cli-table)
export const Output = {
    table: () => import('./output/table.js'),
    csv: () => import('./output/csv.js'),
    markdown: () => import('./output/markdown.js'),
    invoice: () => import('./output/invoice.js')
};

async function resolveProjects(config, client, owner, reporter) {
    let reports = new ReportCollection(config);
    let projectLabels = Array.isArray(config.get('project')) ? config.get('project').join('", "') : config.get('project');
    let projects = Array.isArray(config.get('project')) ? config.get('project') : [config.get('project')];

    reporter.list(`${reporter.look}  Resolving "${projectLabels}"`);

    try {
        await owner.authorized();
    } catch (error) {
        reporter.x(`Invalid access token!`, error);
        throw error;
    }

    try {
        await parallel(projects, async project => {
            switch (config.get('type')) {
                case 'project': {
                    try {
                        let p = await Project.create(config, project, client);
                        let report = new ProjectReport(config, p, client);
                        reports.push(report);
                    } catch (error) {
                        reporter.x(`Project not found or no access rights "${projectLabels}".`, error);
                    }
                    break;
                }

                case 'group': {
                    await owner.getGroup(project);
                    if (config.get('subgroups')) await owner.getSubGroups();
                    await owner.getProjectsByGroup();
                    owner.projects.forEach(p =>  {
                        let project = new Project(config, p, client);
                        reports.push(new ProjectReport(config, project, client))
                    });
                    break;
                }
            }
        }, config, 1);

        config.set('project', projects);
        reporter.out(`\r${reporter.look}  Selected projects: ${reports.reports.map(r => pc.bold(pc.blue(r.project.name))).join(', ')}\n`);

        if (config.get('userColumns')) {
            await reports.forEach(async report => {
                await report.project.members();
                let columns = report.project.users.map(user => `time_${user}`);

                config.set('issueColumns', [...new Set(config.get('issueColumns').concat(columns))]);
                config.set('mergeRequestColumns', [...new Set(config.get('mergeRequestColumns').concat(columns))]);
            });
        }

        reporter.mark();
        return reports;
    } catch (error) {
        reporter.x(`Could not resolve "${projectLabels}"`, error);
        throw error;
    }
}

async function fetchIssues(config, reports, reporter) {
    if (!config.get('query').includes('issues')) return;

    reporter.list(`${reporter.fetch}  Fetching issues`);
    try {
        await reports.forEach(report => report.getIssues());
    } catch (error) {
        reporter.x(`could not fetch issues.`, error);
    }
    reporter.mark();
}

async function fetchMergeRequests(config, reports, reporter) {
    if (!config.get('query').includes('merge_requests')) return;

    reporter.list(`${reporter.fetch}  Fetching merge requests`);
    try {
        await reports.forEach(report => report.getMergeRequests());
    } catch (error) {
        reporter.x(`could not fetch merge requests.`, error);
    }
    reporter.mark();
}

async function fetchTimelogs(reports, reporter) {
    reporter.list(`${reporter.fetch}  Loading timelogs`);
    try {
        await reports.forEach(report => report.getTimelogs());
    } catch (error) {
        reporter.x(`could not load timelogs.`, error);
    }
    reporter.mark();
}

async function mergeReports(reports, master, reporter) {
    reporter.list(`${reporter.merge}  Merging reports`);
    try {
        await reports.forEach(report => master.merge(report));
    } catch (error) {
        reporter.x(`could not merge reports.`, error);
    }
    reporter.mark();
}

async function processIssues(config, master, reporter) {
    if (!(config.get('query').includes('issues') && master.issues.length > 0)) return;

    reporter.bar(`${reporter.process}️  Processing issues`, master.issues.length);
    try {
        await master.processIssues(() => reporter.advance());
    } catch (error) {
        reporter.x(`could not process issues.`, error);
    }
    reporter.mark();
}

async function processMergeRequests(config, master, reporter) {
    if (!(config.get('query').includes('merge_requests') && master.mergeRequests.length > 0)) return;

    reporter.bar(`${reporter.process}️️  Processing merge requests`, master.mergeRequests.length);
    try {
        await master.processMergeRequests(() => reporter.advance());
    } catch (error) {
        reporter.x(`could not process merge requests.`, error);
    }
    reporter.mark();
}

async function makeOutput(config, master, reporter) {
    if (master.issues.length === 0 && master.mergeRequests.length === 0) {
        reporter.error('No issues or merge requests matched your criteria.');
    }

    let output;
    try {
        let module = await Output[config.get('output')]();

        reporter.list(`${reporter.output}  Making report`);
        output = new module.default(config, master);
        output.make();
    } catch (error) {
        reporter.x(`could not make report.`, error);
    }
    reporter.mark();

    return output;
}

/**
 * Resolve projects/groups, fetch issues/merge requests/timelogs, merge
 * and process them, and render the configured output. One interface for
 * the whole report pipeline - testable with a fake client and reporter,
 * without driving commander or process.stdout.
 * @param config a config built by buildReportConfig
 * @param client GitlabClient
 * @param reporter progress/error reporter, shaped like Cli (list/mark/x/bar/advance/out/error + emoji getters)
 * @returns {Promise<import('./output/base.js').default>} the rendered output, ready for toFile/toStdOut
 */
export async function runReport(config, client, reporter = Cli) {
    let owner = new Owner(config, client);
    let reports = await resolveProjects(config, client, owner, reporter);
    await fetchIssues(config, reports, reporter);
    await fetchMergeRequests(config, reports, reporter);
    await fetchTimelogs(reports, reporter);
    let master = new MasterReport(config, client);
    await mergeReports(reports, master, reporter);
    await processIssues(config, master, reporter);
    await processMergeRequests(config, master, reporter);

    return makeOutput(config, master, reporter);
}
