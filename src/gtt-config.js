const program = require('commander');

const Config = require('./include/file-config');
const Fs = require('./include/filesystem');

let config = new Config(process.cwd());

program
    .option('-l, --local', 'edit the local configuration file')
    .parse(process.argv);

if (program.opts().local) {
    config.assertLocalConfig();
}

Fs.open(program.opts().local ? config.local : config.global);
