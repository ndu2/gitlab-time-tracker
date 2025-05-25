import {Command} from 'commander';
import Frame from './models/frame.js';
import Config from './include/file-config.js';
import Cli from './include/cli.js';
import Fs from './include/filesystem.js';


function delCmd() {
    const delCmd = new Command('delete', 'delete time record by the given id')
    .arguments('[id]')
    .action((id, opts, program) => {

let config = new Config(process.cwd());

if (
    (!id || !Fs.exists(Fs.join(config.frameDir, id + '.json')))
    && -Infinity === (id = Fs.newest(config.frameDir))
)
    Cli.error('No record found.');

let file = Fs.join(config.frameDir, id.replace('.json', '') + '.json');
let frame = Frame.fromFile(config, file).stopMe();
Fs.remove(file);
console.log(`Deleting record ${frame.id.magenta}`);
}
);
return delCmd;
}

export default delCmd;
