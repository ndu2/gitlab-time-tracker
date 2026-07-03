import {Command} from 'commander';
import pc from 'picocolors';
import Table from 'cli-table';


import Config from '../../core/file-config.js';
import cli from '../../core/cli.js';
import Timekeeper from '../timekeeper.js';

function list() {
  const list = new Command('list', 'list all open issues or merge requests')
    .arguments('[project]')
    .option('--verbose', 'show verbose output')
    .option('-c, --closed', 'show closed issues (instead of opened only)')
    .option('--my', 'show only issues assigned to me')
    .option('-t, --type <type>', 'specify resource type: issue, merge_request. defaults to issue')
    .option('-m', 'shorthand for --type=merge_request')
    .option('-i', 'shorthand for --type=issue')
    .option('--url <url>', 'URL to GitLabs API')
    .option('--token <token>', 'API access token')
    .action((aproject, options, program) => {

let config = new Config(process.cwd())
        .set('url', program.opts().url)
        .set('token', program.opts().token),
    timekeeper = new Timekeeper(config),
    type = program.opts().type ? program.opts().type : 'issue',
    project = program.args[0];

if (program.opts().i) {
    type = 'issue';
} else if (program.opts().m) {
    type = 'merge_request';
}

timekeeper.list(project, type, program.opts().closed ? 'closed' : 'opened', program.opts().my)
  .then(tasks => {
    let table = new Table({
      style : {compact : true, 'padding-left' : 1}
    });
    if (tasks.length == 0) {
      console.log("No issues or merge requests found.");
    }
    tasks.forEach(issue => {
      table.push([pc.magenta(issue.iid.toString()), pc.green(issue.title) + "\n" + pc.gray(issue.data.web_url), issue.state])
    })
    console.log(table.toString());
  })
  .catch(error => cli.error(error));

}
);
return list;
}

export default list;
