import colors from 'colors';
import moment from 'moment';
import {Command} from 'commander';
import Config from './include/file-config.js';
import Cli from './include/cli.js';
import Tasks from './include/tasks.js';


function create() {
    const create = new Command('create', 'start monitoring time for the given project and create a new issue or merge request with the given title')
    .arguments('[project] [title]')
    .option('-t, --type <type>', 'specify resource type: issue, merge_request')
    .option('--verbose', 'show verbose output')
    .action((aproject, atitle, options, program) => {

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd()),
    tasks = new Tasks(config),
    type = program.opts().type ? program.opts().type : 'issue',
    title = program.args.length === 1 ? program.args[0] : program.args[1],
    project = program.args.length === 2 ? program.args[0] : null;

if (program.args.length < 2 && !config.get('project'))
    Cli.error('No project set');

if (!title)
    Cli.error('Wrong or missing title');

tasks.start(project, type, title)
    .then(frame => console.log(`Starting project ${config.get('project').magenta} and create ${type} "${title.blue}" at ${moment().format('HH:mm').green}`))
    .catch(error => Cli.error(error));
}
);
return create;
}

export default create;
