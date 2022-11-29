const colors = require('colors');
const moment = require('moment');
const program = require('commander');

const Config = require('./include/file-config');
const Cli = require('./include/cli');
const Tasks = require('./include/tasks');

program
    .arguments('[project] [id]')
    .option('-t, --type <type>', 'specify resource type: issue, merge_request')
    .option('-m', 'shorthand for --type=merge_request')
    .option('-i', 'shorthand for --type=issue')
    .option('--verbose', 'show verbose output')
    .option('--note <note>', 'specify note')
    .parse(process.argv);

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd()),
    tasks = new Tasks(config),
    type = program.opts().type ? program.opts().type : 'issue',
    id = program.args.length === 1 ? parseInt(program.args[0]) : parseInt(program.args[1]),
    project = program.args.length === 2 ? program.args[0] : null;

if (program.opts().i) {
    type = 'issue';
} else if (program.opts().m) {
    type = 'merge_request';
}
let note = null;
if (program.opts().note) {
    note = program.opts().note;
}

if (program.args.length < 2 && !config.get('project'))
    Cli.error('No project set');

if (!id)
    Cli.error('Wrong or missing issue/merge_request id');

tasks.start(project, type, id, note)
    .then(frame => console.log(`Starting project ${config.get('project').magenta} ${type.blue} ${('#' + id).blue} at ${moment().format('HH:mm').green}`))
    .catch(error => Cli.error(error));