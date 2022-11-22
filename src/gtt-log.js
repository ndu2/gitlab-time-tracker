const _ = require('underscore');
const program = require('commander');
const colors = require('colors');
const moment = require('moment-timezone');

const Config = require('./include/file-config');
const Cli = require('./include/cli');
const Time = require('./models/time');
const Tasks = require('./include/tasks');

program
    .option('--verbose', 'show verbose output')
    .option('--hours_per_day <hours>', 'hours per day for human readable time formats')
    .option('--time_format <time_format>', 'time format')
    .parse(process.argv);

Cli.verbose = program.opts().verbose;

let config = new Config(__dirname).set('hoursPerDay', program.opts().hours_per_day),
    tasks = new Tasks(config),
    timeFormat = config.set('timeFormat', program.opts().time_format).get('timeFormat', 'log');

function toHumanReadable(input) {
    return Time.toHumanReadable(Math.ceil(input), config.get('hoursPerDay'), timeFormat);
}

tasks.log()
    .then(({frames, times}) => {
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
                        let durationText = toSync ? toHumanReadable(frame.duration).yellow :  toHumanReadable(frame.duration);
                        let issue = frame.resource.new ? `new ${frame.resource.type + ' "' + frame.resource.id.blue}"` : `${(frame.resource.type + ' #' + frame.resource.id).blue}`;
                        console.log(`  ${frame.id}  ${frame.start.clone().format('HH:mm').green} to ${frame.stop.clone().format('HH:mm').green}\t${durationText}\t\t${frame.project.magenta}\t\t${issue}`)
                    });
            });
        }
    )
    .catch(error => Cli.error(error));
