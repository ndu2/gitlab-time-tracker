#!/usr/bin/env node

import version from './version.js';

import { program } from 'commander';

import start from './timekeeping/commands/start.js';
import create from './timekeeping/commands/create.js';
import status from './timekeeping/commands/status.js';
import stop from './timekeeping/commands/stop.js';
import resume from './timekeeping/commands/resume.js';
import cancel from './timekeeping/commands/cancel.js';
import list from './timekeeping/commands/list.js';
import log from './timekeeping/commands/log.js';
import sync from './timekeeping/commands/sync.js';
import edit from './timekeeping/commands/edit.js';
import delCmd from './timekeeping/commands/delete.js';
import config from './timekeeping/commands/config.js';
import report from './reporting/commands/report.js';

program
    .version(version)
    .addCommand(start())
    .addCommand(create())
    .addCommand(status())
    .addCommand(stop())
    .addCommand(resume())
    .addCommand(cancel())
    .addCommand(list())
    .addCommand(log())
    .addCommand(sync())
    .addCommand(edit())
    .addCommand(delCmd())
    .addCommand(report())
    .addCommand(config())
    .parse(process.argv);

    
