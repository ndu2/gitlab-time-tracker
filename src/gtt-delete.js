import program from 'commander';
import Frame from './models/frame';
import Config from './include/file-config';
import Cli from './include/cli';
import Fs from './include/filesystem';

program
    .arguments('[id]')
    .parse(process.argv);

let config = new Config(process.cwd());
let id = program.args[0];

if (
    (!id || !Fs.exists(Fs.join(config.frameDir, id + '.json')))
    && -Infinity === (id = Fs.newest(config.frameDir))
)
    Cli.error('No record found.');

let file = Fs.join(config.frameDir, id.replace('.json', '') + '.json');
let frame = Frame.fromFile(config, file).stopMe();
Fs.remove(file);
console.log(`Deleting record ${frame.id.magenta}`);