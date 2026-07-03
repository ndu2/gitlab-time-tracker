import {Command} from 'commander';
import Config from '../../core/file-config.js';
import Cli from '../../core/cli.js';
import Fs from '../../core/filesystem.js';
import _ from 'underscore';
import Time from '../../core/time.js';
import Frame from '../storage/frame.js';
import select from '@inquirer/checkbox';
import moment from 'moment';
import readline from 'readline';
import Timekeeper from '../timekeeper.js';

const SHIFT_MINUTE = 1;
const SHIFT_MINUTES = 15;

/**
 * interactively edit a frame's start/stop time with keystrokes
 * @param config
 * @param id
 * @returns {Promise<void>}
 */
function interactiveEdit(config, id) {
  return new Promise((resolve, reject) => {
    let frame = Frame.fromFile(config, Fs.join(config.frameDir, id + '.json'));
    let field = 'start';

    function render() {
      Cli.out('\x1Bc');
      Cli.out(`Editing frame ${frame.id}\n\n`);
      Cli.out(`${field === 'start' ? '>' : ' '} Start: ${frame.start.format('YYYY-MM-DD HH:mm')}\n`);
      Cli.out(`${field === 'stop' ? '>' : ' '} Stop:  ${frame.stop ? frame.stop.format('YYYY-MM-DD HH:mm') : '(running)'}\n\n`);
      Cli.out('Tab: switch field   ↑/↓: ±15 min   Enter: save   Esc/q: cancel\n');
    }

    function cleanup() {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.removeListener('keypress', onKeypress);
      process.stdin.pause();
    }

    function onKeypress(str, key) {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit();
      }

      if (key.name === 'tab') {
        field = field === 'start' ? 'stop' : 'start';
      } else if (key.name === 'up' || key.name === 'down') {
        let shift = key.shift ? SHIFT_MINUTE: SHIFT_MINUTES;
        const delta = key.name === 'up' ? shift : -shift;
        if (field === 'start') {
          frame.start = frame.start.clone().add(delta, 'minutes');
        } else {
          frame.stop = (frame.stop || frame.start).clone().add(delta, 'minutes');
        }
      } else if (key.name === 'return') {
        cleanup();
        try {
          frame.write();
          resolve();
        } catch (error) {
          reject(error);
        }
        return;
      } else if (key.name === 'escape' || str === 'q') {
        cleanup();
        resolve();
        return;
      }

      render();
    }

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress', onKeypress);

    render();
  });
}

function edit() {
  const edit = new Command('edit', 'edit time record by the given id')
    .arguments('[id]')
    .option('-f, --following <number>', 'edit also the following (by ctime) of the given [id]')
    .option('-n, --listsize <number>', 'list size', 30)
    .option('-i, --interactive', 'edit start/stop time interactively with keystrokes')
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

function showMenu() {
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
        }).then(async (answers) => {
          let didInteractiveEdit = false;
          for (const answer of answers) {
            if (!Fs.exists(Fs.join(config.frameDir, answer + ".json"))) {
              Cli.error("record not found.");
            } else if (program.opts().interactive) {
              await interactiveEdit(config, answer);
              didInteractiveEdit = true;
            } else {
              Fs.open(Fs.join(config.frameDir, answer + ".json"));
            }
          }

          if (didInteractiveEdit) {
            showMenu();
          }
        });
      }
    })
    .catch((error) => Cli.error(error));
}

if (!id || program.opts().following) {
  showMenu();
} else {
  if (!Fs.exists(Fs.join(config.frameDir, id + ".json")))
    Cli.error("No record found.");
  if (program.opts().interactive) {
    interactiveEdit(config, id.replace(".json", "")).catch((error) => Cli.error(error));
  } else {
    Fs.open(Fs.join(config.frameDir, id.replace(".json", "") + ".json"));
  }
}

}
);
return edit;
}

export default edit;
