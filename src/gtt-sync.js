import moment from 'moment';
import {Command} from 'commander';
import Config from './include/file-config.js';
import Cli from './include/cli.js';
import Tasks from './include/tasks.js';
import Owner from './models/owner.js';

function sync() {
    const sync = new Command('sync', 'sync local time records to GitLab')
    .option('-p --proxy <proxy>', 'use a proxy server with the given url')
    .option('--url <url>', 'URL to GitLabs API')
    .option('--token <token>', 'API access token')
    .option('--insecure', 'don\'t check certificates')
    .option('--verbose', 'show verbose output')
    .action((options, program) => {

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd())
        .set('url', program.opts().url)
        .set('token', program.opts().token)
        .set('insecure', program.opts().insecure)
        .set('proxy', program.opts().proxy);
tasks = new Tasks(config),
owner = new Owner(config);

tasks.syncInit()
    .then(() => tasks.sync.frames.length === 0 ? process.exit(0) : null)
    .then(() => owner.authorized())
    .catch(e => Cli.x(`Invalid access token!`, e))
    .then(() => {
        Cli.bar(`${Cli.fetch}  Fetching or creating issues & merge requests...`, tasks.sync.frames.length);
        return tasks.syncResolve(Cli.advance);
    })
    .then(() => {
        Cli.bar(`${Cli.process}  Processing issues & merge requests...`, tasks.sync.frames.length);
        return tasks.syncDetails(Cli.advance);
    })
    .then(() => {
        Cli.bar(`${Cli.update}  Syncing time records...`, tasks.sync.frames.length);
        return tasks.syncUpdate(Cli.advance)
    })
    .catch(error => Cli.x(error));

}
);
return sync;
}

export default sync;
