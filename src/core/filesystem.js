import fs from 'fs';
import path from 'path';
import open from 'open';
import child_process from 'child_process';

class Filesystem {
    static exists(file) {
        return fs.existsSync(file);
    }

    static remove(file) {
        return fs.unlinkSync(file);
    }

    static readText(file) {
        return fs.readFileSync(file, 'utf8');
    }

    static writeText(file, data) {
        return fs.writeFileSync(file, data);
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
        let files = Filesystem.readDir(dir);
        let ctime = file => fs.statSync(path.join(dir, file.name)).ctime;

        return files.reduce((newest, file) => (ctime(file) > ctime(newest) ? file : newest), files[0] ?? -Infinity);
    }

    static all(dir) {
        let ctime = file => fs.statSync(path.join(dir, file.name)).ctime;

        return Filesystem.readDir(dir).sort((a, b) => ctime(a) - ctime(b));
    }

    static readDir(dir) {
        return fs.readdirSync(dir, { withFileTypes: true }).filter(file=>file.isFile() && file.name.endsWith(".json"));
    }
}

export default Filesystem;
