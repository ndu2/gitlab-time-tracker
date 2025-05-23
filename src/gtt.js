#!/usr/bin/env node

let version = "1.8.0";

import { program } from 'commander';

import start from './gtt-start.js';
import create from './gtt-create.js';
import status from './gtt-status.js';
import stop from './gtt-stop.js';
import resume from './gtt-resume.js';
import cancel from './gtt-cancel.js';
import list from './gtt-list.js';
import log from './gtt-log.js';
import sync from './gtt-sync.js';
import edit from './gtt-edit.js';
import delCmd from './gtt-delete.js';
import report from './gtt-report.js';
import config from './gtt-config.js';

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

    
