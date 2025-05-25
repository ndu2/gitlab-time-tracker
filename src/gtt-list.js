import {Command} from 'commander';
import colors from 'colors';
import moment from 'moment';
import Table from 'cli-table';


import Config from './include/file-config.js';
import cli from './include/cli.js';
import Tasks from './include/tasks.js';

function list() {
  const list = new Command('list', 'list all open issues')
    .arguments('[project]')
    .option('--verbose', 'show verbose output')
    .option('-c, --closed', 'show closed issues (instead of opened only)')
    .option('--my', 'show only issues assigned to me')
    .action((aproject, options, program) => {

let config = new Config(process.cwd()),
    tasks = new Tasks(config),
    type = program.opts().type ? program.opts().type : 'issue',
    project = program.args[0];

tasks.list(project, program.opts().closed ? 'closed' : 'opened', program.opts().my)
  .then(issues => {
    let table = new Table({
      style : {compact : true, 'padding-left' : 1}
    });
    if (issues.length == 0) {
      console.log("No issues found.");
    }
    issues.forEach(issue => {
      table.push([issue.iid.toString().magenta, issue.title.green + "\n" + issue.data.web_url.gray, issue.state])
    })
    console.log(table.toString());
  })
  .catch(error => cli.error(error));

}
);
return list;
}

export default list;
