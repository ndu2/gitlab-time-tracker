import pc from 'picocolors';
import dayjs from '../../core/dayjs.js';
import {Command} from 'commander';
import Cli from '../../core/cli.js';
import Timekeeper from '../timekeeper.js';


function start(configLoader) {
    const start = new Command('start')
    .description('start monitoring time for the given project and resource id')
    .arguments('[project] [id]')
    .option('-t, --type <type>', 'specify resource type: issue, merge_request')
    .option('-m', 'shorthand for --type=merge_request')
    .option('-i', 'shorthand for --type=issue')
    .option('--verbose', 'show verbose output')
    .option('--note <note>', 'specify note')
    .action((arg1, arg2, options, program) => {

Cli.verbose = program.opts().verbose;

let config = configLoader(),
    timekeeper = new Timekeeper(config),
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

timekeeper.start(project, type, id, note)
    .then(frame => Cli.out(`Starting project ${pc.magenta(config.get('project'))} ${pc.blue(type)} ${pc.blue(('#' + id))} at ${pc.green(dayjs().format('HH:mm'))}\n`))
    .catch(error => Cli.error(error));
}
);
return start;
}

export default start;
