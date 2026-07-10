import fs from 'fs';
import Config from './config.js';
import { dump as yamlDump } from 'js-yaml';
import Fs from './filesystem.js';
import envPaths from 'env-paths';
import { findLocalConfigDir, readConfigFile, resolveLocalConfig } from './configFile.js';

/**
 * file config with local and global configuration files
 */
class FileConfig extends Config {
    /**
     * construct
     * @param workDir
     * @param load set to false to skip parsing the config files, e.g. when
     *   recovering from a broken config to still resolve its paths
     */
    constructor(workDir, recover) {
        super();
        this.assertGlobalConfig(recover);
        this.workDir = workDir;
        if(!recover) {
            this.data = Object.assign(this.data, this.localExists() ? resolveLocalConfig(this.local, this.global) : readConfigFile(this.global));
        }
        if (!fs.existsSync(this.frameDir)) fs.mkdirSync(this.frameDir, { recursive: true });
    }

    localExists() {
        if (fs.existsSync(this.local)) return true;

        let found = findLocalConfigDir(this.workDir, this.localConfigFile);
        if (found === null) return false;

        this.workDir = found;
        return true;
    }

    assertGlobalConfig(recover) {
        if(!fs.existsSync(this.globalDir) && fs.existsSync(this.oldGlobalDir)) {
            fs.renameSync(this.oldGlobalDir, this.globalDir);
        }

        if (!fs.existsSync(this.globalDir)) fs.mkdirSync(this.globalDir, { recursive: true });
        if (recover && !fs.existsSync(this.global)) fs.appendFileSync(this.global, yamlDump(this.data));
    }

    assertLocalConfig() {
        if (!this.localExists()) fs.appendFileSync(this.local, '');
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

    get global() {
        return Fs.join(this.globalDir, 'config.yml');
    }

    get local() {
        return Fs.join(this.workDir, this.localConfigFile);
    }
}

export default FileConfig;
