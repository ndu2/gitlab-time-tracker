import fs from 'fs';
import path from 'path';
import os from 'os';
import Config from './config.js';
import { load as yamlLoad } from 'js-yaml';
import hash from 'hash-sum';
import Fs from './filesystem.js';
import envPaths from 'env-paths';
import Cli from './cli.js';

const readYaml = file => yamlLoad(fs.readFileSync(file, 'utf8'));


/**
 * file config with local and global configuration files
 */
class FileConfig extends Config {
    /**
     * construct
     * @param workDir
     */
    constructor(workDir) {
        super();
        this.assertGlobalConfig();
        this.workDir = workDir;
        this.data = Object.assign(this.data, this.localExists() ? this.parseLocal() : this.parseGlobal());
        if (!fs.existsSync(this.frameDir)) fs.mkdirSync(this.frameDir, { recursive: true });
        this.cache = {
            delete: this._cacheDelete,
            get: this._cacheGet,
            set: this._cacheSet,
            dir: this.cacheDir
        };
    }

    /**
     * parse the global config
     * @returns {Object}
     */
    parseGlobal() {
        try {
            return readYaml(this.global);
        } catch (e) {
            e.message = `Error parsing configuration: "${this.global}": ${e.message}`;
            throw e;
        }
    }

    /**
     * parse the local config
     * @returns {Object}
     */
    parseLocal() {
        let local;
        try {
            local = Object.assign({extend: true}, readYaml(this.local));
        } catch (e) {
            e.message = `Error parsing configuration: "${this.local}": ${e.message}`;
            throw e;
        }

        if (local.extend === true) {
            let global = this.parseGlobal();
            local = Object.assign(global ? global : {}, local);
        } else if (local.extend) {
            try {
                local = Object.assign(readYaml(local.extend), local);
            } catch (e) {
                e.message = `Error parsing configuration: "${local.extend}": ${e.message}`;
                throw e;
            }
        }

        return local;
    }

    localExists() {
        if (fs.existsSync(this.local)) return true;

        let root = (os.platform() === "win32") ? process.cwd().split(path.sep)[0] + "\\" : "/";
        let workDir = this.workDir;
        while (workDir) {
            workDir = path.dirname(workDir);
            if (workDir === root) workDir = '';
            if (fs.existsSync(Fs.join(workDir, this.localConfigFile))) {
                this.workDir = workDir;
                return true;
            }
        }
    }

    assertGlobalConfig() {
        if(!fs.existsSync(this.globalDir) && fs.existsSync(this.oldGlobalDir)) {
            fs.renameSync(this.oldGlobalDir, this.globalDir);
        }



        if (!fs.existsSync(this.globalDir)) fs.mkdirSync(this.globalDir, { recursive: true });
        if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir, { recursive: true });
        if (!fs.existsSync(this.global)) fs.appendFileSync(this.global, '');
    }

    assertLocalConfig() {
        if (!this.localExists()) fs.appendFileSync(this.local, '');
    }

    _cacheDelete(key) {
        let file = Fs.join(this.dir, hash(key));
        if (!fs.existsSync(file)) return false;

        return fs.unlinkSync(file);
    }

    _cacheGet(key) {
        let file = Fs.join(this.dir, hash(key));
        if (!fs.existsSync(file)) return false;

        return JSON.parse(fs.readFileSync(file));
    }

    _cacheSet(key, value) {
        let file = Fs.join(this.dir, hash(key));
        if (fs.existsSync(file)) fs.unlinkSync(file);
        fs.appendFile(file, JSON.stringify(value), () => {
        });

        return value;
    }

    get localConfigFile() {
        return '.gtt.yml';
    }

    get oldGlobalDir() {
        return Fs.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.gtt');
    }

    get globalDir() {
        return envPaths(".gtt", {suffix:""}).data;
    }

    get frameDir() {
        if(this.data.frameDir) {
            return this.data.frameDir;
        }
        return Fs.join(this.globalDir, 'frames');
    }

    get cacheDir() {
        return Fs.join(this.globalDir, 'cache')
    }

    get global() {
        return Fs.join(this.globalDir, 'config.yml');
    }

    get local() {
        return Fs.join(this.workDir, this.localConfigFile);
    }
}

export default FileConfig;
