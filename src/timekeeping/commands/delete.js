import { Command } from 'commander';
import Frame from '../storage/frame.js';
import Cli from '../../core/cli.js';
import Fs from '../../core/filesystem.js';
import pc from 'picocolors';

function delCmd(configLoader) {
    const delCmd = new Command('delete')
        .description('delete time record by the given id')
        .arguments('[id]')
        .action((id, opts, program) => {

            let config = configLoader();

            if (!id && -Infinity === (id = Fs.newest(config.frameDir).name))
                Cli.error('No record found.');

            let file = Fs.join(config.frameDir, id.replace('.json', '') + '.json');
            if (!Fs.exists(file)) {
                Cli.error(`Record ${id} not found.`);
            } else {
                let frame = Frame.fromFile(config, file).stopMe();
                Fs.remove(file);
                Cli.out(`Deleting record ${pc.magenta(frame.id)}\n`);
            }
        }
        );
    return delCmd;
}

export default delCmd;
