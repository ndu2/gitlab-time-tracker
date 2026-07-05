import {Command} from 'commander';
import pc from 'picocolors';
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
                return Cli.out(`Stopping project ${pc.magenta(frame.project)} ${pc.blue(frame.resource.type)} ${pc.blue(('#' + frame.resource.id))}, started ${pc.green(dayjs(frame.start).fromNow())} (id: ${frame.id})\n`)

            Cli.out(`Stopping project ${pc.magenta(frame.project)} for new ${frame.resource.type} "${pc.blue((frame.resource.id))}", started ${pc.green(dayjs(frame.start).fromNow())} (id: ${frame.id})\n`)
        });
    })
    .catch(error => Cli.error(error));
}
);
return stop;
}

export default stop;
