import fs from 'fs';
import {Command} from 'commander';
import Config from '../../core/file-config.js';
import Cli from '../../core/cli.js';
import Fs from '../../core/filesystem.js';
import Zip from '../../core/zip.js';
import Timekeeper from '../timekeeper.js';

function archive() {
    const archive = new Command('archive', 'archive synced time records into yearly zip files (filesYYYY.zip), one folder per month')
        .option('--year <year>', 'only archive the given year')
        .option('--verbose', 'show verbose output')
        .action((options, program) => {

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd()),
    timekeeper = new Timekeeper(config),
    year = program.opts().year;

timekeeper.archiveInit()
    .then(grouped => {
        let years = year ? Object.keys(grouped).filter(y => y === year) : Object.keys(grouped);

        if (years.length === 0) {
            console.log('Nothing to archive.');
            return;
        }

        years.forEach(archiveYear => {
            let file = Fs.join(config.frameDir, `files${archiveYear}.zip`),
                zip = Zip.fromFile(file),
                frames = [];

            Object.keys(grouped[archiveYear]).forEach(month => {
                grouped[archiveYear][month].forEach(frame => {
                    zip.addFile(`${month}/${frame.id}.json`, fs.readFileSync(frame.file), frame.date.toDate());
                    frames.push(frame);
                });
            });

            zip.write(file);
            frames.forEach(frame => Fs.remove(frame.file));

            console.log(`Archived ${frames.length} record(s) into ${file}`);
        });
    })
    .catch(error => Cli.error(error));

}
);
return archive;
}

export default archive;
