#!/usr/bin/env node

import version from './version.js';

import { program } from 'commander';

import Config from './core/file-config.js';
import Cli from './core/cli.js';
import config from './core/commands/config.js';
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
import archive from './timekeeping/commands/archive.js';
import report from './reporting/commands/report.js';

/**
 * build the config, only called once a command actually runs
 * @param recover if true, fall back to a config with unparsed data instead
 *   of exiting when the config file fails to parse (used by the config
 *   command itself, so it stays usable to fix a broken file)
 * @returns {Config}
 */
function loadConfig(recover = false) {
    try {
        return new Config(process.cwd(), recover);
    } catch (e) {
        Cli.error(`${e.message}`);
    }
}

program
    .version(version)
    .addCommand(start(loadConfig))
    .addCommand(create(loadConfig))
    .addCommand(status(loadConfig))
    .addCommand(stop(loadConfig))
    .addCommand(resume(loadConfig))
    .addCommand(cancel(loadConfig))
    .addCommand(list(loadConfig))
    .addCommand(log(loadConfig))
    .addCommand(sync(loadConfig))
    .addCommand(edit(loadConfig))
    .addCommand(delCmd(loadConfig))
    .addCommand(archive(loadConfig))
    .addCommand(report(loadConfig))
    .addCommand(config(() => loadConfig(true)))
    .parse(process.argv);

    
