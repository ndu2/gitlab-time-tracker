import fs from 'fs';
import os from 'os';
import path from 'path';
import { expect } from 'chai';
import { findLocalConfigDir, readConfigFile, resolveLocalConfig } from '../../src/core/configFile.js';

describe('findLocalConfigDir', () => {
    let dir;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtt-configfile-'));
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('finds the file in the starting directory', () => {
        fs.writeFileSync(path.join(dir, '.gtt.yml'), '');

        expect(findLocalConfigDir(dir, '.gtt.yml')).to.equal(dir);
    });

    it('walks up through parent directories to find the file', () => {
        fs.writeFileSync(path.join(dir, '.gtt.yml'), '');
        const nested = path.join(dir, 'a', 'b', 'c');
        fs.mkdirSync(nested, { recursive: true });

        expect(findLocalConfigDir(nested, '.gtt.yml')).to.equal(dir);
    });

    it('returns null when no config file is found up to the root', () => {
        const nested = path.join(dir, 'a', 'b');
        fs.mkdirSync(nested, { recursive: true });

        expect(findLocalConfigDir(nested, '.this-file-does-not-exist.yml')).to.equal(null);
    });
});

describe('readConfigFile', () => {
    let dir;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtt-configfile-'));
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('parses a valid YAML file', () => {
        const file = path.join(dir, 'config.yml');
        fs.writeFileSync(file, 'token: abc\nurl: https://example.com\n');

        expect(readConfigFile(file)).to.deep.equal({ token: 'abc', url: 'https://example.com' });
    });

    it('throws a contextualized error for invalid YAML', () => {
        const file = path.join(dir, 'broken.yml');
        fs.writeFileSync(file, 'token: [unclosed');

        expect(() => readConfigFile(file)).to.throw(new RegExp(`Error parsing configuration: "${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    });

    it('throws a contextualized error for a missing file', () => {
        const file = path.join(dir, 'missing.yml');

        expect(() => readConfigFile(file)).to.throw(new RegExp(`Error parsing configuration: "${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    });
});

describe('resolveLocalConfig', () => {
    let dir;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtt-configfile-'));
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    function write(name, content) {
        const file = path.join(dir, name);
        fs.writeFileSync(file, content);
        return file;
    }

    it('returns the local config as-is when extend is explicitly disabled', () => {
        const local = write('local.yml', 'extend: false\ntoken: local-token\n');
        const global = write('global.yml', 'token: global-token\nurl: https://global.example\n');

        expect(resolveLocalConfig(local, global)).to.deep.equal({ extend: false, token: 'local-token' });
    });

    it('defaults to extending the global config when extend is not specified', () => {
        const local = write('local.yml', 'token: local-token\n');
        const global = write('global.yml', 'token: global-token\nurl: https://global.example\n');

        expect(resolveLocalConfig(local, global)).to.deep.equal({
            extend: true,
            token: 'local-token',
            url: 'https://global.example'
        });
    });

    it('merges global underneath local when extend is true (the default)', () => {
        const local = write('local.yml', 'extend: true\ntoken: local-token\n');
        const global = write('global.yml', 'token: global-token\nurl: https://global.example\n');

        expect(resolveLocalConfig(local, global)).to.deep.equal({
            extend: true,
            token: 'local-token',
            url: 'https://global.example'
        });
    });

    it('merges an explicitly named file underneath local when extend is a path', () => {
        const other = write('other.yml', 'token: other-token\nurl: https://other.example\n');
        const local = write('local.yml', `extend: ${other}\ntoken: local-token\n`);
        const global = write('global.yml', 'token: global-token\n');

        expect(resolveLocalConfig(local, global)).to.deep.equal({
            extend: other,
            token: 'local-token',
            url: 'https://other.example'
        });
    });
});
