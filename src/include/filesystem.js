import _ from 'underscore';
import fs from 'fs';
import path from 'path';
import open from 'open';
import find from 'find-in-files';
import child_process from 'child_process';

class filesystem {
    static find(pattern, dir) {
        return new Promise((resolve, reject) => {
            find.find(pattern, dir)
                .then(results => resolve(_.keys(results)))
                .catch(error => reject(error));
        });
    }

    static exists(file) {
        return fs.existsSync(file);
    }

    static remove(file) {
        return fs.unlinkSync(file);
    }

    static open(file) {
        let editor = process.env.VISUAL;

        if (editor || (editor = process.env.EDITOR)) {
            return child_process.spawn(editor, [file], {
                stdio: 'inherit'
            });
        } else {
            return open(file);
        }
    }

    static join(...args) {
        return path.join(...args);
    }

    static newest(dir) {
        return _.max(fs.readdirSync(dir), file => (fs.statSync(path.join(dir, file)).ctime));
    }

    static all(dir) {
        return _.sortBy(fs.readdirSync(dir), file => (fs.statSync(path.join(dir, file)).ctime));
    }

    static readDir(dir) {
        return fs.readdirSync(dir);
    }
}

export default filesystem;
