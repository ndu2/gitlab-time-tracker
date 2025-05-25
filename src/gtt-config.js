import {Command} from 'commander';
import Config from './include/file-config.js';
import Fs from './include/filesystem.js';

let config = new Config(process.cwd());

function cfgCmd() {
    const cfgCmd = new Command('config', 'edit the configuration file in your default editor')
    .option('-l, --local', 'edit the local configuration file')
    .action((options, program) => {

if (program.opts().local) {
    config.assertLocalConfig();
}

Fs.open(program.opts().local ? config.local : config.global);
}
);
return cfgCmd;
}

export default cfgCmd;
