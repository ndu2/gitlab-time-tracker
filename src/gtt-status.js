const program = require('commander');
const colors = require('colors');
const moment = require('moment');

const Config = require('./include/file-config');
const Cli = require('./include/cli');
const Tasks = require('./include/tasks');

program
    .option('--verbose', 'show verbose output')
    .option('-s', 'short output')
    .parse(process.argv);

Cli.verbose = program.opts().verbose;

let config = new Config(__dirname),
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