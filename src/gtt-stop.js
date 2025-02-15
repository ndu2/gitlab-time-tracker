const program = require('commander');
const colors = require('colors');
const moment = require('moment');

const Config = require('./include/file-config');
const Cli = require('./include/cli');
const Tasks = require('./include/tasks');

program
    .option('--verbose', 'show verbose output')
    .parse(process.argv);

Cli.verbose = program.opts().verbose;

let config = new Config(__dirname),
    tasks = new Tasks(config);

tasks.stop()
    .then(frames => {
        frames.forEach(frame => {
            if(!frame.resource.new)
                return console.log(`Stopping project ${frame.project.magenta} ${frame.resource.type.blue} ${('#' + frame.resource.id).blue}, started ${moment(frame.start).fromNow().green} (id: ${frame.id})`)

            console.log(`Stopping project ${frame.project.magenta} for new ${frame.resource.type} "${(frame.resource.id).blue}", started ${moment(frame.start).fromNow().green} (id: ${frame.id})`)
        });
    })
    .catch(error => Cli.error(error));