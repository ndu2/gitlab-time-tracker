const moment = require('moment');
const program = require('commander');

const Config = require('./include/file-config');
const Cli = require('./include/cli');
const Tasks = require('./include/tasks');
const Owner = require('./models/owner');

program
    .option('-p --proxy <proxy>', 'use a proxy server with the given url')
    .option('--url <url>', 'URL to GitLabs API')
    .option('--token <token>', 'API access token')
    .option('--insecure', 'don\'t check certificates')
    .option('--verbose', 'show verbose output')
    .parse(process.argv);

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
