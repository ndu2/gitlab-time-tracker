import {Command} from 'commander';
import Config from '../../core/file-config.js';
import Cli from '../../core/cli.js';
import Fs from '../../core/filesystem.js';
import Time from '../../core/time.js';
import Frame from '../storage/frame.js';
import select from '@inquirer/checkbox';
import dayjs from '../../core/dayjs.js';
import readline from 'readline';
import Timekeeper from '../timekeeper.js';
import pc from 'picocolors';

const SHIFT_MINUTE = 1;
const SHIFT_MINUTES = 15;

function column(str, n) {
  if (str.length > n) {
    str = str.substr(0, n - 1) + "…";
  }
  return str.padEnd(n);
}

/**
 * formats a frame as a single list row, shared by the interactive and
 * non-interactive menus; `focus` ('start'|'stop') highlights that field,
 * `edited` ('start'|'stop'|'both') colors edited field(s) red
 * @param frame
 * @param focus
 * @param edited
 * @returns {string}
 */
function formatFrameRow(frame, focus, edited) {
  const startText = frame.start.clone().format("MMMM Do YYYY HH:mm");
  const stopText = frame.stop ? "to " + frame.stop.clone().format("HH:mm") : "(running)";
  const startColor = edited === "start" || edited === "both" ? pc.red : pc.green;
  const stopColor = edited === "stop" || edited === "both" ? pc.red : pc.green;
  const start = focus === "start" ? pc.inverse(startColor(startText)) : startColor(startText);
  const stop = focus === "stop" ? pc.inverse(stopColor(stopText)) : stopColor(stopText);
  const issue = `${
    pc.blue((frame.resource.type + " #" + frame.resource.id).padEnd(20))
  }${column(frame.title != null ? frame.title : "", 50)}`;
  return `${frame.id}  ${start} ${stop}\t${pc.magenta(column(frame.project, 50))}${issue}${
    frame.note != null ? frame.note : ""
  }`;
}

/**
 * interactively edit start/stop time of a list of frames inline, with keystrokes
 * @param frames
 * @returns {Promise<void>}
 */
function showInteractiveMenu(frames) {
  return new Promise((resolve, reject) => {
    if (frames.length === 0) {
      Cli.error('No records found.');
      resolve();
      return;
    }

    // fields is a flat cycle of [frameIndex, 'start'|'stop'] pairs
    const fields = frames.flatMap((_, i) => [[i, 'start'], [i, 'stop']]);
    let cursor = 0;
    // per-frame set of edited field names ('start'/'stop')
    const editedFields = frames.map(() => new Set());

    function render() {
      Cli.out('\x1Bc');
      Cli.out('Tab/Shift+Tab: switch field   ↑/↓: ±15 min (Shift: ±1 min)   Enter: save all   Esc/q: cancel\n\n');
      frames.forEach((frame, i) => {
        const focus = fields[cursor][0] === i ? fields[cursor][1] : null;
        const edited = editedFields[i];
        const editedArg = edited.has('start') && edited.has('stop') ? 'both' : edited.has('start') ? 'start' : edited.has('stop') ? 'stop' : null;
        Cli.out(`${formatFrameRow(frame, focus, editedArg)}\n`);
      });
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

      const [frameIdx, field] = fields[cursor];
      const frame = frames[frameIdx];

      if (key.name === 'tab') {
        cursor = key.shift ? (cursor - 1 + fields.length) % fields.length : (cursor + 1) % fields.length;
      } else if (key.name === 'up' || key.name === 'down') {
        let shift = key.shift ? SHIFT_MINUTE : SHIFT_MINUTES;
        const delta = key.name === 'up' ? shift : -shift;
        if (field === 'start') {
          frame.start = frame.start.clone().add(delta, 'minutes');
        } else {
          frame.stop = (frame.stop || frame.start).clone().add(delta, 'minutes');
        }
        editedFields[frameIdx].add(field);
      } else if (key.name === 'return') {
        cleanup();
        try {
          frames.forEach((frame) => frame.write());
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
    .option('--today', 'only list entries for today')
    .option('--this_week', 'only list entries for this week')
    .action((id, opts ,program) => {

let config = new Config(process.cwd());
let timeFormat = config.set('timeFormat', program.opts().time_format).get('timeFormat', 'log');
let timekeeper = new Timekeeper(config);
const listSize = program.opts().listsize;

function toHumanReadable(input) {
    return Time.toHumanReadable(Math.ceil(input), config.get('hoursPerDay'), timeFormat);
}

function getMenuFrames() {
  return timekeeper.all().then(({ frames }) => {
    frames.sort((a, b) => (a.start.isBefore(b.start) ? -1 : 1));
    if (id) {
      let idx = frames.findIndex((fr) => fr.id == id);
      let following = Number(program.opts().following);
      if (!Number.isInteger(following)) {
        following = 0;
      }
      if (idx >= 0) {
        frames = frames.slice(idx, idx + following);
      } else {
        frames = [];
      }
    } else if (program.opts().today || program.opts().this_week) {
      let from = program.opts().today ? dayjs().startOf('day') : dayjs().startOf('week');
      let to = program.opts().today ? dayjs().endOf('day') : dayjs().endOf('week');
      frames = frames.filter((fr) => !fr.start.isBefore(from) && !fr.start.isAfter(to));
    } else {
      frames = frames.slice(-listSize); // last listSize frames (one page of inquirer)
    }
    return frames;
  });
}

function showNonInteractiveMenu(frames) {
  let lastFramesDetails = frames.map((frame) => ({
    name: `  ${formatFrameRow(frame)}`,
    value: frame.id,
  }));

  if (lastFramesDetails.length == 0) {
    Cli.error("No records found.");
    return;
  }

  select({
    message: "Frame?",
    default: lastFramesDetails[lastFramesDetails.length - 1].value,
    choices: lastFramesDetails,
    pageSize: listSize,
  }).then((answers) => {
    for (const answer of answers) {
      if (!Fs.exists(Fs.join(config.frameDir, answer + ".json"))) {
        Cli.error("record not found.");
      } else {
        Fs.open(Fs.join(config.frameDir, answer + ".json"));
      }
    }
  });
}

if (!id || program.opts().following) {
  getMenuFrames()
    .then((frames) => {
      if (program.opts().interactive) {
        return showInteractiveMenu(frames);
      } else {
        return showNonInteractiveMenu(frames);
      }
    })
    .catch((error) => Cli.error(error));
} else {
  if (!Fs.exists(Fs.join(config.frameDir, id + ".json")))
    Cli.error("No record found.");
  if (program.opts().interactive) {
    let frame = Frame.fromFile(config, Fs.join(config.frameDir, id.replace(".json", "") + ".json"));
    showInteractiveMenu([frame]).catch((error) => Cli.error(error));
  } else {
    Fs.open(Fs.join(config.frameDir, id.replace(".json", "") + ".json"));
  }
}

}
);
return edit;
}

export default edit;
