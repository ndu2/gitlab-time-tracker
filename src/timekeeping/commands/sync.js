import moment from 'moment';
import {Command} from 'commander';
import Config from '../../core/file-config.js';
import Cli from '../../core/cli.js';
import Timekeeper from '../timekeeper.js';
import Owner from '../../core/owner.js';

function sync() {
    const sync = new Command('sync', 'sync local time records to GitLab')
    .option('--url <url>', 'URL to GitLabs API')
    .option('--token <token>', 'API access token')
    .option('--verbose', 'show verbose output')
    .action((options, program) => {

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd())
        .set('url', program.opts().url)
        .set('token', program.opts().token),
timekeeper = new Timekeeper(config),
owner = new Owner(config);

timekeeper.syncInit()
    .then(() => timekeeper.sync.frames.length === 0 ? process.exit(0) : null)
    .then(() => owner.authorized())
    .catch(e => Cli.x(`Invalid access token!`, e))
    .then(() => {
        Cli.bar(`${Cli.fetch}  Fetching or creating issues & merge requests...`, timekeeper.sync.frames.length);
        return timekeeper.syncResolve(Cli.advance);
    })
    .then(() => {
        Cli.bar(`${Cli.process}  Processing issues & merge requests...`, timekeeper.sync.frames.length);
        return timekeeper.syncDetails(Cli.advance);
    })
    .then(() => {
        Cli.bar(`${Cli.update}  Syncing time records...`, timekeeper.sync.frames.length);
        return timekeeper.syncUpdate(Cli.advance)
    })
    .catch(error => Cli.x(error));

}
);
return sync;
}

export default sync;
