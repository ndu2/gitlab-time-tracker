import {Command} from 'commander';
import pc from 'picocolors';
import dayjs from '../../core/dayjs.js';
import Cli from '../../core/cli.js';
import Timekeeper from '../timekeeper.js';

function cancel(configLoader) {
  const cancel = new Command('cancel')
    .description('cancel and discard active monitoring time')
    .option('--verbose', 'show verbose output')
    .action((options, program) => {

Cli.verbose = program.opts().verbose;

let config = configLoader();
let timekeeper = new Timekeeper(config);

timekeeper.cancel()
    .then(frames => {
        frames.forEach(frame => {
            if(!frame.resource.new)
                return Cli.out(`Cancel project ${pc.magenta(frame.project)} ${pc.blue(frame.resource.type)} ${pc.blue(('#' + frame.resource.id))}, started ${pc.green(dayjs(frame.start).fromNow())}\n`)

            Cli.out(`Cancel project ${pc.magenta(frame.project)} for new ${frame.resource.type} "${pc.blue((frame.resource.id))}", started ${pc.green(dayjs(frame.start).fromNow())}\n`)
        })
    })
    .catch(error => Cli.error(error));
    }
);
return cancel;
}

export default cancel;
