import {Command} from 'commander';
import colors from 'colors';
import dayjs from '../../core/dayjs.js';
import Config from '../../core/file-config.js';
import Cli from '../../core/cli.js';
import Timekeeper from '../timekeeper.js';


function stop() {
    const stop = new Command('stop', 'stop monitoring time')
    .option('--verbose', 'show verbose output')
    .action((options, program) => {

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd()),
    timekeeper = new Timekeeper(config);

timekeeper.stop()
    .then(frames => {
        frames.forEach(frame => {
            if(!frame.resource.new)
                return console.log(`Stopping project ${frame.project.magenta} ${frame.resource.type.blue} ${('#' + frame.resource.id).blue}, started ${dayjs(frame.start).fromNow().green} (id: ${frame.id})`)

            console.log(`Stopping project ${frame.project.magenta} for new ${frame.resource.type} "${(frame.resource.id).blue}", started ${dayjs(frame.start).fromNow().green} (id: ${frame.id})`)
        });
    })
    .catch(error => Cli.error(error));
}
);
return stop;
}

export default stop;
