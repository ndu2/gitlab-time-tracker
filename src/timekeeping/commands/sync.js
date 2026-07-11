import {Command} from 'commander';
import Cli from '../../core/cli.js';
import Timekeeper from '../timekeeper.js';
import Owner from '../../core/api/owner.js';

function sync(configLoader) {
    const sync = new Command('sync')
    .description('sync local time records to GitLab')
    .option('--url <url>', 'URL to GitLabs API')
    .option('--token <token>', 'API access token')
    .option('--verbose', 'show verbose output')
    .action(async (options, program) => {

Cli.verbose = program.opts().verbose;

let config = configLoader()
        .set('url', program.opts().url)
        .set('token', program.opts().token);
let timekeeper = new Timekeeper(config),
    owner = new Owner(config);

let frames = await timekeeper.pendingFrames();
if (frames.length === 0) process.exit(0);

try {
    await owner.authorized();
} catch (e) {
    Cli.x(`Invalid access token!`, e);
    return;
}

const phaseMessages = {
    resolve: `${Cli.fetch}  Fetching or creating issues & merge requests...`,
    details: `${Cli.process}  Processing issues & merge requests...`,
    update: `${Cli.update}  Syncing time records...`
};

try {
    await timekeeper.sync(frames, {
        onPhase: (phase, total) => Cli.bar(phaseMessages[phase], total),
        onProgress: () => Cli.advance()
    });
} catch (error) {
    Cli.x(error);
}

}
);
return sync;
}

export default sync;
