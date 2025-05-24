import program from 'commander';
import colors from 'colors';
import moment from 'moment';
import Config from './include/file-config';
import Cli from './include/cli';
import Tasks from './include/tasks';

program
    .arguments('[project]')
    .option('--verbose', 'show verbose output')
    .parse(process.argv);

Cli.verbose = program.opts().verbose;

let config = new Config(process.cwd()).set('project', program.args[0]),
    tasks = new Tasks(config);

if (!config.get('project'))
    Cli.error('No project set');

tasks.resume()
    .then(frame => console.log(`Starting project ${config.get('project').magenta} ${frame.resource.type.blue} ${('#' + frame.resource.id).blue} at ${moment().format('HH:mm').green}`))
    .catch(error => Cli.error(error));
