import {Command} from 'commander';
import Config from './include/file-config.js';
import Cli from './include/cli.js';
import Fs from './include/filesystem.js';
import _ from 'underscore';
import Time from './models/time.js';
import Frame from './models/frame.js';
import select from '@inquirer/select';



function edit() {
  const edit = new Command('edit', 'edit time record by the given id')
    .arguments('[id]')
    .action((id, opts ,program) => {

let config = new Config(process.cwd());
let timeFormat = config.set('timeFormat', program.opts().time_format).get('timeFormat', 'log');
const listSize = 30;

function column(str, n){
    if(str.length > n) {
        str = str.substr(0, n-1) + "…"
    }
    return str.padEnd(n);
}

function toHumanReadable(input) {
    return Time.toHumanReadable(Math.ceil(input), config.get('hoursPerDay'), timeFormat);
}

if (!id) {
  let lastFrames = Fs.all(config.frameDir).slice(-listSize); // last listSize frames (one page of inquirer)
  lastFrames = lastFrames.map((file) =>
    Frame.fromFile(config, Fs.join(config.frameDir, file.name))
  );

  let lastFramesDetails = lastFrames
    .sort((a, b) => (a.start.isBefore(b.start) ? -1 : 1))
    .map((frame) => {
      let issue = `${
        (frame.resource.type + " #" + frame.resource.id).padEnd(20).blue
      }${column(frame.title != null ? frame.title : "", 50)}`;
      return {
        name:
          `  ${frame.id}  ${frame.start.clone().format("MMMM Do YYYY HH:mm").green} ${
            frame.stop ? "to " + frame.stop.clone().format("HH:mm").green : "(running)"}\t` +
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
      }).then((answer) => {
        if (!Fs.exists(Fs.join(config.frameDir, answer + ".json"))) {
          Cli.error("record not found.");
        } else {
          Fs.open(Fs.join(config.frameDir, answer + ".json"));
        }
      });
    }
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
