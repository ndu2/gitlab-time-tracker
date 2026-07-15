import fs from 'fs';
import os from 'os';
import path from 'path';
import { load as yamlLoad } from 'js-yaml';
import Fs from './filesystem.js';

/**
 * Walk up from startDir looking for a file named `filename`.
 * @param startDir
 * @param filename
 * @returns {string|null} the directory it was found in, or null
 */
export function findLocalConfigDir(startDir, filename) {
    if (fs.existsSync(Fs.join(startDir, filename))) return startDir;

    const root = (os.platform() === 'win32') ? process.cwd().split(path.sep)[0] + '\\' : '/';
    let dir = startDir;

    while (dir) {
        dir = path.dirname(dir);
        if (dir === root) dir = '';
        if (fs.existsSync(Fs.join(dir, filename))) return dir;
    }

    return null;
}

/**
 * Read and parse one YAML config file.
 * @param file
 * @returns {Object}
 */
export function readConfigFile(file) {
    try {
        return yamlLoad(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        e.message = `Error parsing configuration: "${file}": ${e.message}`;
        throw e;
    }
}

/**
 * Resolve a local config against the extend: chaining rule: local
 * overrides global (extend: true, the default), local overrides an
 * explicitly named file (extend: <path>), or local stands alone.
 * @param localFile
 * @param globalFile
 * @returns {Object}
 */
export function resolveLocalConfig(localFile, globalFile) {
    let local = Object.assign({extend: true}, readConfigFile(localFile));

    if (local.extend === true) {
        let global = readConfigFile(globalFile);
        return Object.assign(global ? global : {}, local);
    }

    if (local.extend) {
        return Object.assign(readConfigFile(local.extend), local);
    }

    return local;
}
