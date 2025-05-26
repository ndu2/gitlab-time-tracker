import { Command } from 'commander';
import colors from 'colors';
import moment from 'moment';
import Config from './include/file-config.js';
import Cli from './include/cli.js';
import Tasks from './include/tasks.js';
import Fs from './include/filesystem.js';
import Frame from './models/frame.js';
import select from '@inquirer/select';

const listSize = 30;

function column(str, n) {
    if (str.length > n) {
        str = str.substr(0, n - 1) + "…"
    }
    return str.padEnd(n);
}

function resumeFrame(tasks, frame) {
    tasks.resume(frame)
        .then(frame => console.log(`Starting project ${frame.project.magenta} ${frame.resource.type.blue} ${('#' + frame.resource.id).blue} ${frame.note?frame.note:''} at ${moment().format('HH:mm').green}`))
        .catch(error => Cli.error(error));
}

function resume() {
    const resume = new Command('resume', 'resume monitoring time for last stopped record')
        .arguments('[project]')
        .option('--verbose', 'show verbose output')
        .option('--ask', 'ask the activity to resume from the last entries, ignoring project')
        .action((project, options, program) => {

            Cli.verbose = program.opts().verbose;

            let config = new Config(process.cwd()).set('project', project),
                tasks = new Tasks(config);

            if (!config.get('project'))
                Cli.error('No project set');

            let lastFrames = Fs.all(config.frameDir).slice(-listSize); // last listSize frames (one page of inquirer)
            lastFrames = lastFrames.map((file) =>
                Frame.fromFile(config, Fs.join(config.frameDir, file.name))
            );
            lastFrames = lastFrames.sort((a, b) => moment(a.stop || moment()).isBefore(moment(b.stop || moment())) ? 1 : -1);

            if (!options.ask) {
                let project = config.get('project');
                let filteredFrames = lastFrames.filter(frame => (!project) || frame.project === project);
                resumeFrame(tasks, (filteredFrames.length > 0) ? filteredFrames[0] : undefined);
            } else {
                let lastFramesDetails = lastFrames
                    .sort((a, b) => (a.start.isBefore(b.start) ? -1 : 1))
                    .map((frame) => {
                        let issue = `${(frame.resource.type + " #" + frame.resource.id).padEnd(20).blue
                            }${column(frame.title != null ? frame.title : "", 50)}`;
                        return {
                            name:
                                `  ${frame.id}  ${frame.start.clone().format("MMMM Do YYYY HH:mm").green} ${frame.stop ? "to " + frame.stop.clone().format("HH:mm").green : "(running)"}\t` +
                                `${column(frame.project, 50).magenta}${issue}${frame.note != null ? frame.note : ""
                                }`,
                            value: frame,
                        };
                    });
                    if (lastFramesDetails.length == 0) {
                      Cli.error("No records found.");
                    } else {
                      select({
                        message: "Frame?",
                        default:
                          lastFramesDetails[lastFramesDetails.length - 1].value,
                        choices: lastFramesDetails,
                        pageSize: listSize,
                      }).then((answer) => {
                        resumeFrame(tasks, answer);
                      });
                    }
            }


        }

        );
    return resume;
}

export default resume;
