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
function formatFrameRow(frame, focus, editedStart, editedEnd, editedNote, noteOverride) {
  const startText = frame.start.clone().format("MMMM Do YYYY HH:mm");
  const stopText = frame.stop ? "to " + frame.stop.clone().format("HH:mm") : "(running)";
  const startColor = editedStart? pc.red : pc.green;
  const stopColor = editedEnd ? pc.red : pc.green;
  const start = focus === "start" ? pc.inverse(startColor(startText)) : startColor(startText);
  const stop = focus === "stop" ? pc.inverse(stopColor(stopText)) : stopColor(stopText);
  const issue = `${
    pc.blue((frame.resource.type + " #" + frame.resource.id).padEnd(20))
  }${column(frame.title != null ? frame.title : "", 50)}`;
  const note = noteOverride != null ? noteOverride : (frame.note != null ? frame.note : "");
  const noteDisplay = editedNote ? pc.red(note) : note;
  return `${frame.id}  ${start} ${stop}\t${pc.magenta(column(frame.project, 50))}${issue}${noteDisplay}`;
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
    // per-frame set of edited field names ('start'/'stop'/'note')
    const editedFields = frames.map(() => new Set());
    // original start/stop/note values, used to reset a frame's edits
    const originals = frames.map((frame) => ({
      start: frame.start.clone(),
      stop: frame.stop ? frame.stop.clone() : null,
      note: frame.note,
    }));

    // index of the frame whose note is currently being edited inline, or null
    let noteEditIndex = null;
    let noteBuffer = '';

    // adjustment modes, cycled with m
    const modes = [
      { amount: SHIFT_MINUTES, moveAdjacent: true, label: '±15 min' },
      { amount: SHIFT_MINUTE, moveAdjacent: true, label: '±1 min' },
      { amount: SHIFT_MINUTES, moveAdjacent: false, label: '±15 min, don\'t move adjacent frame' },
      { amount: SHIFT_MINUTE, moveAdjacent: false, label: '±1 min, don\'t move adjacent frame' },
    ];
    let mode = 0;

    function render() { // w write does not really save all, does it?
      Cli.out('\x1Bc');
      if (noteEditIndex !== null) {
        Cli.out('Editing note. Enter: confirm   Esc: cancel\n\n\n');
      } else {
        Cli.out('←/→ (or Tab/Shift+Tab): switch field   ↑/↓: switch frame   +/-: adjust time   m: cycle mode   r: reset frame   e: edit note (if not yet synced)   Enter: save selected   w: save all   q: exit (ignored on unsaved changes)   Esc: exit\n');
        Cli.out(`Mode: ${modes[mode].label}\n\n`);
      }
      frames.forEach((frame, i) => {
        const focus = fields[cursor][0] === i ? fields[cursor][1] : null;
        const edited = editedFields[i];
        const noteOverride = noteEditIndex === i ? pc.inverse(noteBuffer + ' ') : null;
        Cli.out(`${formatFrameRow(frame, focus, edited.has('start'), edited.has('end'), edited.has('note'), noteOverride)}\n`);
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

      if (noteEditIndex !== null) {
        if (key.name === 'return') {
          frames[noteEditIndex].note = noteBuffer;
          noteEditIndex = null;
          noteBuffer = '';
        } else if (key.name === 'escape') {
          noteEditIndex = null;
          noteBuffer = '';
        } else if (key.name === 'backspace') {
          noteBuffer = noteBuffer.slice(0, -1);
        } else if (str && !key.ctrl && !key.meta) {
          noteBuffer += str;
        }
        render();
        return;
      }

      const [frameIdx, field] = fields[cursor];
      const frame = frames[frameIdx];

      if (key.name === 'tab' || key.name === 'left' || key.name === 'right') {
        const forward = key.name === 'left' ? false : key.name === 'right' ? true : !key.shift;
        cursor = forward ? (cursor + 1) % fields.length : (cursor - 1 + fields.length) % fields.length;
      } else if (key.name === 'up' || key.name === 'down') {
        cursor = key.name === 'down' ? (cursor + 2) % fields.length : (cursor - 2 + fields.length) % fields.length;
      } else if (key.name === 'r') {
        frame.start = originals[frameIdx].start.clone();
        frame.stop = originals[frameIdx].stop ? originals[frameIdx].stop.clone() : null;
        frame.note = originals[frameIdx].note;
        editedFields[frameIdx].clear();
      } else if (key.name === 'e') {
        if (frame.notes.length == 0) {
          editedFields[frameIdx].add('note');
          noteEditIndex = frameIdx;
          noteBuffer = frame.note != null ? frame.note : '';
        }
      } else if (str === 'm') {
        mode = (mode + 1) % modes.length;
      } else if (str === '+' || str === '-') {
        const delta = str === '+' ? modes[mode].amount : -modes[mode].amount;
        if (field === 'start') {
          const newStart = frame.start.clone().add(delta, 'minutes');
          if (!frame.stop || !newStart.isAfter(frame.stop)) {
            const prev = frames[frameIdx - 1];
            const linked = modes[mode].moveAdjacent && prev && prev.stop && Math.abs(frame.start.diff(prev.stop, 'minutes', true)) < 1;
            if (linked) {
              const newPrevStop = prev.stop.clone().add(delta, 'minutes');
              if (!newPrevStop.isBefore(prev.start)) {
                prev.stop = newPrevStop;
                editedFields[frameIdx - 1].add('stop');
                frame.start = newStart;
              }
            } else if (!(prev && prev.stop && newStart.isBefore(prev.stop))) {
              frame.start = newStart;
            }
          }
        } else {
          const newStop = (frame.stop || frame.start).clone().add(delta, 'minutes');
          if (!newStop.isBefore(frame.start)) {
            const next = frames[frameIdx + 1];
            const linked = modes[mode].moveAdjacent && next && frame.stop && Math.abs(next.start.diff(frame.stop, 'minutes', true)) < 1;
            if (linked) {
              const newNextStart = next.start.clone().add(delta, 'minutes');
              if (!(next.stop && newNextStart.isAfter(next.stop))) {
                next.start = newNextStart;
                editedFields[frameIdx + 1].add('start');
                frame.stop = newStop;
              }
            } else if (!(next && newStop.isAfter(next.start))) {
              frame.stop = newStop;
            }
          }
        }
        editedFields[frameIdx].add(field);
      } else if (key.name === 'w') {
        frames.forEach((frame, i) => {
          frame.write()
          editedFields[i].clear();
        });
      } else if (key.name === 'return') {
        frames[frameIdx].write()
        editedFields[frameIdx].clear();
      } else if (key.name === 'escape' || str === 'q') {
        if(key.name === 'escape' || editedFields.reduce((a,c)=> a + c.size, 0) == 0)
        {
          cleanup();
          resolve();
          return;
        }
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
    .option('--day <day>', 'only list entries for this day')
    .option('--week <day>', 'only list entries for the week of this day')
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
    if (id) {
      let idx = frames.findIndex((fr) => fr.id == id);
      let following = Number(program.opts().following);
      if (!Number.isInteger(following)) {
        following = 0;
      }
      if (idx >= 0) {
        frames.sort((a, b) => (a.start.isBefore(b.start) ? -1 : 1));
        frames = frames.slice(idx, idx + following);
      } else {
        frames = [];
      }
    } else if (program.opts().today || program.opts().this_week) {
      let from = program.opts().today ? dayjs().startOf('day') : dayjs().startOf('week');
      let to = program.opts().today ? dayjs().add(1, 'day').startOf('day') : dayjs().endOf('week').add(1, 'day').startOf('day');
      frames = frames.filter((fr) => !fr.start.isBefore(from) && !fr.start.isAfter(to));
      frames.sort((a, b) => (a.start.isBefore(b.start) ? -1 : 1));
    } else if (program.opts().day || program.opts().week) {
      let userDay = dayjs.utc(program.opts().day ? program.opts().day : program.opts().week);
      if(!userDay.isValid()) {
        Cli.error("invalid day.");
        frames = [];
      } else {
        let from = program.opts().day ? userDay.startOf('day') : userDay.startOf('week');
        let to = program.opts().day ? userDay.add(1, 'day').startOf('day') : userDay.endOf('week').add(1, 'day').startOf('day');
        frames = frames.filter((fr) => !fr.start.isBefore(from) && !fr.start.isAfter(to));
        frames.sort((a, b) => (a.start.isBefore(b.start) ? -1 : 1));
      }
    } else {
      let to = dayjs().subtract(2, 'month');
      frames = frames.filter((fr) => fr.start.isAfter(to));
      frames.sort((a, b) => (a.start.isBefore(b.start) ? -1 : 1));
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
