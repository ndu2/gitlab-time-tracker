import {Command} from 'commander';
import pc from 'picocolors';
import dayjs from '../../core/dayjs.js';
import Cli from '../../core/cli.js';
import Time from '../../core/time.js';
import Timekeeper from '../timekeeper.js';
import mergeRequest from '../api/mergeRequest.js';

function log(configLoader) {
  const log = new Command('log', 'log recorded time records')
    .option('--verbose', 'show verbose output')
    .option('--hours_per_day <hours>', 'hours per day for human readable time formats')
    .option('--time_format <time_format>', 'time format')
    .option('--csv', 'comma separated output')
    .action((options, program) => {

Cli.verbose = program.opts().verbose;

let config = configLoader().set('hoursPerDay', program.opts().hours_per_day);
let timekeeper = new Timekeeper(config),
    timeFormat = config.set('timeFormat', program.opts().time_format).get('timeFormat', 'log');

function toHumanReadable(input) {
    return Time.toHumanReadable(Math.ceil(input), config.get('hoursPerDay'), timeFormat);
}

function column(str, n){
    if(str.length > n) {
        str = str.substr(0, n-1) + "…"
    }
    return str.padEnd(n);
  }

const logCSV = (frames, times) => {
    Cli.out("frameId, project, issueid, date, starttime, endtime, duration (s), title, note\n");
    Object.keys(frames).sort().forEach(date => {
        if (!frames.hasOwnProperty(date)) return;
        frames[date].sort((a, b) => a.start.isBefore(b.start) ? -1 : 1)
        .forEach(frame => {
            Cli.out(`${frame.id}, ${frame.project}, ${frame.resource.id}, ${dayjs(date).format('YYYY-MM-DD')}, ${frame.start.clone().format('HH:mm')}, ${frame.stop.clone().format('HH:mm')}, ${frame.duration}, ${frame.title!=null?frame.title:''}, ${frame.note!=null?frame.note:''}\n`);
        });
    });
};

const logCli =  (frames, times) => {
    Object.keys(frames).sort().forEach(date => {
        if (!frames.hasOwnProperty(date)) return;
        
        let dayNote = "";
        let hpd = config.get('hoursPerDay');
        if(times[date] > hpd*3600*2)
        {
            dayNote = pc.red(` - worked over ${hpd*2} hours`);
        }else if(times[date] > hpd*3600*1.5)
        {
            dayNote = pc.yellow(` - worked over ${hpd*1.5} hours`);
        }else if(times[date] > hpd*3600*1.1)
        {
            dayNote = pc.green(` - worked over ${hpd*1.1} hours`);
        }
        

        Cli.out(pc.green(`${dayjs(date).format('MMMM Do YYYY')} (${toHumanReadable(times[date])})`) + dayNote + '\n');
        frames[date]
            .sort((a, b) => a.start.isBefore(b.start) ? -1 : 1)
            .forEach(frame => {
                let toSync = (Math.ceil(frame.duration) - parseInt(frame.notes.reduce((n, m) => (n + m.time), 0))) != 0;
                let durationText = toSync ? pc.yellow(toHumanReadable(frame.duration).padEnd(14)) :  toHumanReadable(frame.duration).padEnd(14);
                let issue = frame.resource.new ? 
                column(`(new ${frame.resource.type + ' "' + frame.resource.id}")`, 70).bgBlue:
                `${pc.blue((frame.resource.type + ' #' + frame.resource.id).padEnd(20))}${column(frame.title!=null?frame.title:'', 50)}`;
                Cli.out(`  ${frame.id}  ${pc.green(frame.start.clone().format('HH:mm'))} to ${pc.green(frame.stop.clone().format('HH:mm'))}\t${durationText}`+
                `${pc.magenta(column(frame.project, 50))}${issue}${frame.note!=null?frame.note:''}\n`);
            });
    });
};

const log = program.opts().csv? logCSV : logCli;

timekeeper.log()
    .then(({frames, times}) => log(frames, times))
    .catch(error => Cli.error(error));

}
);
return log;
}

export default log;
