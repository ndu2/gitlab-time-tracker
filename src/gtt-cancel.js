import {Command} from 'commander';
import colors from 'colors';
import moment from 'moment';
import Config from './include/file-config.js';
import Cli from './include/cli.js';
import Tasks from './include/tasks.js';

function cancel() {
  const cancel = new Command('cancel', 'cancel and discard active monitoring time')
    .option('--verbose', 'show verbose output')
    .action((options, program) => {

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd());
let tasks = new Tasks(config);

tasks.cancel()
    .then(frames => {
        frames.forEach(frame => {
            if(!frame.resource.new)
                return console.log(`Cancel project ${frame.project.magenta} ${frame.resource.type.blue} ${('#' + frame.resource.id).blue}, started ${moment(frame.start).fromNow().green}`)

            console.log(`Cancel project ${frame.project.magenta} for new ${frame.resource.type} "${(frame.resource.id).blue}", started ${moment(frame.start).fromNow().green}`)
        })
    })
    .catch(error => Cli.error(error));
    }
);
return cancel;
}

export default cancel;
