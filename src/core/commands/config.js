import {Command} from 'commander';
import Fs from '../filesystem.js';

function cfgCmd(configLoader) {
    const cfgCmd = new Command('config')
    .description('edit the configuration file in your default editor')
    .option('-l, --local', 'edit the local configuration file')
    .action((options, program) => {

let config = configLoader();

if (program.opts().local) {
    config.assertLocalConfig();
}

Fs.open(program.opts().local ? config.local : config.global);
}
);
return cfgCmd;
}

export default cfgCmd;
