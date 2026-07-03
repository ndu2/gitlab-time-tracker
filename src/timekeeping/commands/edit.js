import {Command} from 'commander';
import Config from '../../core/file-config.js';
import Cli from '../../core/cli.js';
import Fs from '../../core/filesystem.js';
import _ from 'underscore';
import Time from '../../core/time.js';
import Frame from '../storage/frame.js';
import select from '@inquirer/checkbox';
import moment from 'moment';
import Timekeeper from '../timekeeper.js';



function edit() {
  const edit = new Command('edit', 'edit time record by the given id')
    .arguments('[id]')
    .option('-f, --following <number>', 'edit also the following (by ctime) of the given [id]')
    .option('-n, --listsize <number>', 'list size', 30)
    .action((id, opts ,program) => {

let config = new Config(process.cwd());
let timeFormat = config.set('timeFormat', program.opts().time_format).get('timeFormat', 'log');
let timekeeper = new Timekeeper(config);
const listSize = program.opts().listsize;

function column(str, n){
    if(str.length > n) {
        str = str.substr(0, n-1) + "…"
    }
    return str.padEnd(n);
}

function toHumanReadable(input) {
    return Time.toHumanReadable(Math.ceil(input), config.get('hoursPerDay'), timeFormat);
}

if (!id || program.opts().following) {
  timekeeper
    .all()
    .then(({ frames }) => {
      frames.sort((a, b) => (a.start.isBefore(b.start) ? -1 : 1));
      if (id) {
        let idx = frames.findIndex((fr) => fr.id == id);
        let following = Number(program.opts().following);
        if (!Number.isInteger(following)) {
          following = 0;
        }
        if (idx >= 0) {
          frames = frames.slice(idx, idx + following);
        }
        else
        {
          frames = [];
        }
      } else {
        frames = frames.slice(-listSize); // last listSize frames (one page of inquirer)
      }
      let lastFramesDetails = frames.map((frame) => {
        let issue = `${
          (frame.resource.type + " #" + frame.resource.id).padEnd(20).blue
        }${column(frame.title != null ? frame.title : "", 50)}`;
        return {
          name:
            `  ${frame.id}  ${frame.start.clone().format("MMMM Do YYYY HH:mm").green} ${
              frame.stop
                ? "to " + frame.stop.clone().format("HH:mm").green
                : "(running)"
            }\t` +
            `${column(frame.project, 50).magenta}${issue}${
              frame.note != null ? frame.note : ""
            }`,
          value: frame.id,
        };
      });

      if (lastFramesDetails.length == 0) {
        Cli.error("No records found.");
      } else {
        select({
          message: "Frame?",
          default: lastFramesDetails[lastFramesDetails.length - 1].value,
          choices: lastFramesDetails,
          pageSize: listSize,
        }).then((answers) => {
          answers.forEach((answer) => {
            if (!Fs.exists(Fs.join(config.frameDir, answer + ".json"))) {
              Cli.error("record not found.");
            } else {
              Fs.open(Fs.join(config.frameDir, answer + ".json"));
            }
          });
        });
      }
    })
    .catch((error) => Cli.error(error));
} else {
  if (!Fs.exists(Fs.join(config.frameDir, id + ".json")))
    Cli.error("No record found.");
  Fs.open(Fs.join(config.frameDir, id.replace(".json", "") + ".json"));
}

}
);
return edit;
}

export default edit;
