import {program} from 'commander';
import Config from './include/file-config.js';
import Fs from './include/filesystem.js';

let config = new Config(process.cwd());

program
    .option('-l, --local', 'edit the local configuration file')
    .parse(process.argv);

if (program.opts().local) {
    config.assertLocalConfig();
}

Fs.open(program.opts().local ? config.local : config.global);
