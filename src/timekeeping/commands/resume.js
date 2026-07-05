import { Command } from 'commander';
import pc from 'picocolors';
import dayjs from '../../core/dayjs.js';
import Config from '../../core/file-config.js';
import Cli from '../../core/cli.js';
import Timekeeper from '../timekeeper.js';
import Fs from '../../core/filesystem.js';
import Frame from '../storage/frame.js';
import select from '@inquirer/select';

const listSize = 30;

function column(str, n) {
    if (str.length > n) {
        str = str.substr(0, n - 1) + "…"
    }
    return str.padEnd(n);
}

function resumeFrame(timekeeper, frame) {
    timekeeper.resume(frame)
        .then(frame => Cli.out(`Starting project ${pc.magenta(frame.project)} ${pc.blue(frame.resource.type)} ${pc.blue(('#' + frame.resource.id))} ${frame.note?frame.note:''} at ${pc.green(dayjs().format('HH:mm'))}\n`))
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
                timekeeper = new Timekeeper(config);

            if (!config.get('project'))
                Cli.error('No project set');

            let lastFrames = Fs.all(config.frameDir).slice(-listSize); // last listSize frames (one page of inquirer)
            lastFrames = lastFrames.map((file) =>
                Frame.fromFile(config, Fs.join(config.frameDir, file.name))
            );
            lastFrames = lastFrames.sort((a, b) => dayjs(a.stop || dayjs()).isBefore(dayjs(b.stop || dayjs())) ? 1 : -1);

            if (!options.ask) {
                let project = config.get('project');
                let filteredFrames = lastFrames.filter(frame => (!project) || frame.project === project);
                resumeFrame(timekeeper, (filteredFrames.length > 0) ? filteredFrames[0] : undefined);
            } else {
                let lastFramesDetails = lastFrames
                    .sort((a, b) => (a.start.isBefore(b.start) ? -1 : 1))
                    .map((frame) => {
                        let issue = `${pc.blue((frame.resource.type + " #" + frame.resource.id).padEnd(20))
                            }${column(frame.title != null ? frame.title : "", 50)}`;
                        return {
                            name:
                                `  ${frame.id}  ${pc.green(frame.start.clone().format("MMMM Do YYYY HH:mm"))} ${frame.stop ? "to " + pc.green(frame.stop.clone().format("HH:mm")) : "(running)"}\t` +
                                `${pc.magenta(column(frame.project, 50))}${issue}${frame.note != null ? frame.note : ""
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
                        resumeFrame(timekeeper, answer);
                      });
                    }
            }


        }

        );
    return resume;
}

export default resume;
