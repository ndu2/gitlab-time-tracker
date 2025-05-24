import _ from 'underscore';
import program from 'commander';
import colors from 'colors';
import moment from 'moment-timezone';
import Config from './include/file-config';
import Cli from './include/cli';
import Time from './models/time';
import Tasks from './include/tasks';
import mergeRequest from './models/mergeRequest';

program
    .option('--verbose', 'show verbose output')
    .option('--hours_per_day <hours>', 'hours per day for human readable time formats')
    .option('--time_format <time_format>', 'time format')
    .option('--csv', 'comma separated output')
    .parse(process.argv);

Cli.verbose = program.opts().verbose;

let config = new Config(__dirname).set('hoursPerDay', program.opts().hours_per_day),
    tasks = new Tasks(config),
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
    console.log("frameId, project, issueid, date, starttime, endtime, duration (s), title, note");
    Object.keys(frames).sort().forEach(date => {
        if (!frames.hasOwnProperty(date)) return;
        frames[date].sort((a, b) => a.start.isBefore(b.start) ? -1 : 1)
        .forEach(frame => {
            console.log(`${frame.id}, ${frame.project}, ${frame.resource.id}, ${moment(date).format('YYYY-MM-DD')}, ${frame.start.clone().format('HH:mm')}, ${frame.stop.clone().format('HH:mm')}, ${frame.duration}, ${frame.title!=null?frame.title:''}, ${frame.note!=null?frame.note:''}`);
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
            dayNote = ` - worked over ${hpd*2} hours`.red;
        }else if(times[date] > hpd*3600*1.5)
        {
            dayNote = ` - worked over ${hpd*1.5} hours`.yellow;
        }else if(times[date] > hpd*3600*1.1)
        {
            dayNote = ` - worked over ${hpd*1.1} hours`.green;
        }
        

        console.log(`${moment(date).format('MMMM Do YYYY')} (${toHumanReadable(times[date])})`.green + dayNote);
        frames[date]
            .sort((a, b) => a.start.isBefore(b.start) ? -1 : 1)
            .forEach(frame => {
                let toSync = (Math.ceil(frame.duration) - parseInt(_.reduce(frame.notes, (n, m) => (n + m.time), 0))) != 0;
                let durationText = toSync ? toHumanReadable(frame.duration).padEnd(14).yellow :  toHumanReadable(frame.duration).padEnd(14);
                let issue = frame.resource.new ? 
                column(`(new ${frame.resource.type + ' "' + frame.resource.id}")`, 70).bgBlue:
                `${(frame.resource.type + ' #' + frame.resource.id).padEnd(20).blue}${column(frame.title!=null?frame.title:'', 50)}`;
                console.log(`  ${frame.id}  ${frame.start.clone().format('HH:mm').green} to ${frame.stop.clone().format('HH:mm').green}\t${durationText}`+
                `${column(frame.project, 50).magenta}${issue}${frame.note!=null?frame.note:''}`);
            });
    });
};

const log = program.opts().csv? logCSV : logCli;

tasks.log()
    .then(({frames, times}) => log(frames, times))
    .catch(error => Cli.error(error));
