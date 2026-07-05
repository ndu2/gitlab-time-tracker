import {Command} from 'commander';
import pc from 'picocolors';
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
                Cli.out('gtt idle \n');
            }else {
                Cli.out('No projects are started right now.\n');
            }
            return;
        }
        if (program.opts().s) {
            frames.forEach(frame => Cli.out(`${pc.magenta(frame.project)} ${pc.blue(frame.resource.type)} ${pc.blue(('#' + frame.resource.id))} ${pc.green(dayjs(frame.start).fromNow())} (id: ${frame.id})\n`));
        } else {
            frames.forEach(frame => Cli.out(`Project ${pc.magenta(frame.project)} ${pc.blue(frame.resource.type)} ${pc.blue(('#' + frame.resource.id))} ${frame.note?frame.note:''} is running, started ${pc.green(dayjs(frame.start).fromNow())} (id: ${frame.id})\n`));
        }
    })
    .catch(error => Cli.error('Could not read frames.', error));
}
);
return status;
}

export default status;
