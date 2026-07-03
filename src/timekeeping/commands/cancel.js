import {Command} from 'commander';
import pc from 'picocolors';
import dayjs from '../../core/dayjs.js';
import Config from '../../core/file-config.js';
import Cli from '../../core/cli.js';
import Timekeeper from '../timekeeper.js';

function cancel() {
  const cancel = new Command('cancel', 'cancel and discard active monitoring time')
    .option('--verbose', 'show verbose output')
    .action((options, program) => {

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd());
let timekeeper = new Timekeeper(config);

timekeeper.cancel()
    .then(frames => {
        frames.forEach(frame => {
            if(!frame.resource.new)
                return console.log(`Cancel project ${pc.magenta(frame.project)} ${pc.blue(frame.resource.type)} ${pc.blue(('#' + frame.resource.id))}, started ${pc.green(dayjs(frame.start).fromNow())}`)

            console.log(`Cancel project ${pc.magenta(frame.project)} for new ${frame.resource.type} "${pc.blue((frame.resource.id))}", started ${pc.green(dayjs(frame.start).fromNow())}`)
        })
    })
    .catch(error => Cli.error(error));
    }
);
return cancel;
}

export default cancel;
