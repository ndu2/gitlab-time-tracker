import {Command} from 'commander';
import colors from 'colors';
import dayjs from '../../core/dayjs.js';
import Config from '../../core/file-config.js';
import Cli from '../../core/cli.js';
import Timekeeper from '../timekeeper.js';


function status() {
    const status = new Command('status', 'shows if time monitoring is running')
    .option('--verbose', 'show verbose output')
    .option('-s', 'short output')
    .action((options, program) => {

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd()),
    timekeeper = new Timekeeper(config);

timekeeper.status()
    .then(frames => {
        if (frames.length === 0) {
            if (program.opts().s) {
                console.log('gtt idle ');
            }else {
                console.log('No projects are started right now.');
            }
            return;
        }
        if (program.opts().s) {
            frames.forEach(frame => console.log(`${frame.project.magenta} ${frame.resource.type.blue} ${('#' + frame.resource.id).blue} ${dayjs(frame.start).fromNow().green} (id: ${frame.id})`));
        } else {
            frames.forEach(frame => console.log(`Project ${frame.project.magenta} ${frame.resource.type.blue} ${('#' + frame.resource.id).blue} ${frame.note?frame.note:''} is running, started ${dayjs(frame.start).fromNow().green} (id: ${frame.id})`));
        }
    })
    .catch(error => Cli.error('Could not read frames.', error));
}
);
return status;
}

export default status;
