const program = require('commander');
const Config = require('./include/file-config');
const Cli = require('./include/cli');
const Fs = require('./include/filesystem');
const _ = require('underscore');
const Time = require('./models/time');
const Frame = require('./models/frame');
const inquirer = require('inquirer');


program
    .arguments('[id]')
    .parse(process.argv);

let config = new Config(process.cwd());
let id = program.args[0];
let timeFormat = config.set('timeFormat', program.opts().time_format).get('timeFormat', 'log');


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
  lastFrames = Fs.all(config.frameDir).slice(-10); // last 10 frames (one page of inquirer)
  lastFrames = lastFrames.map((file) =>
    Frame.fromFile(config, Fs.join(config.frameDir, file))
  );

  lastFramesDetails = lastFrames
    .sort((a, b) => (a.start.isBefore(b.start) ? -1 : 1))
    .map((frame) => {
      let toSync =
        Math.ceil(frame.duration) -
          parseInt(_.reduce(frame.notes, (n, m) => n + m.time, 0)) !=
        0;
      let durationText = toSync
        ? toHumanReadable(frame.duration).padEnd(14).yellow
        : toHumanReadable(frame.duration).padEnd(14);
      let issue = `${
        (frame.resource.type + " #" + frame.resource.id).padEnd(20).blue
      }${column(frame.title != null ? frame.title : "", 50)}`;
      return {
        name:
          `  ${frame.id}  ${frame.start.clone().format("MMMM Do YYYY HH:mm").green} ${
            frame.stop ? "to" + frame.stop.clone().format("HH:mm").green : "(running)"
          }\t${durationText}` +
          `${column(frame.project, 50).magenta}${issue}${
            frame.note != null ? frame.note : ""
          }`,
        value: frame.id,
      };
    });

  inquirer
    .prompt([
      {
        type: "list",
        name: "frame",
        message: "Frame?",
        default: lastFramesDetails.length - 1,
        choices: lastFramesDetails,
        pageSize: 10,
      },
    ])
    .then((answer) => {
      if (!Fs.exists(Fs.join(config.frameDir, answer.frame + ".json"))) {
        Cli.error("record not found.");
      } else {
        Fs.open(Fs.join(config.frameDir, answer.frame + ".json"));
      }
    });
} else {
  if (!Fs.exists(Fs.join(config.frameDir, id + ".json")))
    Cli.error("No record found.");
  Fs.open(Fs.join(config.frameDir, id.replace(".json", "") + ".json"));
}

