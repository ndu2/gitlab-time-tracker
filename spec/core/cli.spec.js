import { expect } from 'chai';
import sinon from 'sinon';
import Cli, { CliExitError } from '../../src/core/cli.js';

describe('Cli', () => {
    let exitStub, writeStub;

    beforeEach(() => {
        Cli.quiet = false;
        Cli.verbose = false;
        exitStub = sinon.stub(process, 'exit');
        writeStub = sinon.stub(process.stdout, 'write');
    });

    afterEach(() => {
        exitStub.restore();
        writeStub.restore();
    });

    describe('error', () => {
        it('throws a CliExitError instead of exiting the process', () => {
            expect(() => Cli.error('boom')).to.throw(CliExitError, 'boom');
            expect(exitStub.called).to.be.false;
        });

        it('carries exit code 1', () => {
            try {
                Cli.error('boom');
            } catch (e) {
                expect(e.code).to.equal(1);
            }
        });

        it('prints the error message before throwing', () => {
            expect(() => Cli.error('boom')).to.throw();
            expect(writeStub.calledWithMatch(/Error:.*boom/)).to.be.true;
        });

        it('extracts .message from an Error instance passed as message, keeping the original for verbose logging', () => {
            const original = new Error('underlying failure');
            let caught;

            try {
                Cli.error(original);
            } catch (e) {
                caught = e;
            }

            expect(caught.message).to.equal('underlying failure');
        });
    });

    describe('x', () => {
        it('throws (via Cli.error) when given a message', () => {
            expect(() => Cli.x('boom')).to.throw(CliExitError, 'boom');
        });

        it('does not throw when given no message - just stops the spinner', async () => {
            await Cli.x();

            expect(exitStub.called).to.be.false;
        });
    });

    describe('out/warn', () => {
        it('out writes to stdout unless quiet', () => {
            Cli.out('hello');
            expect(writeStub.calledWith('hello')).to.be.true;

            writeStub.resetHistory();
            Cli.quiet = true;
            Cli.out('hello');
            expect(writeStub.called).to.be.false;
        });

        it('warn does not throw', () => {
            expect(() => Cli.warn('careful')).to.not.throw();
        });
    });
});
