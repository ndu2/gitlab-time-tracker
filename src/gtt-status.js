import {program} from 'commander';
import colors from 'colors';
import moment from 'moment';
import Config from './include/file-config.js';
import Cli from './include/cli.js';
import Tasks from './include/tasks.js';

program
    .option('--verbose', 'show verbose output')
    .option('-s', 'short output')
    .parse(process.argv);

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd()),
    tasks = new Tasks(config);

tasks.status()
    .then(frames => {
        if (frames.length === 0) {
            if (program.opts().s) {
                console.log('gtt idle ');
            }else {
                console.log('No projects are started right now.');
            }
            return;
        }
        if (program.opts().s) {
            frames.forEach(frame => console.log(`${frame.project.magenta} ${frame.resource.type.blue} ${('#' + frame.resource.id).blue} ${moment(frame.start).fromNow().green} (id: ${frame.id})`));
        } else {
            frames.forEach(frame => console.log(`Project ${frame.project.magenta} ${frame.resource.type.blue} ${('#' + frame.resource.id).blue} ${frame.note?frame.note:''} is running, started ${moment(frame.start).fromNow().green} (id: ${frame.id})`));
        }
    })
    .catch(error => Cli.error('Could not read frames.', error));