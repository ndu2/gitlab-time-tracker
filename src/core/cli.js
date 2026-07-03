import pc from 'picocolors';
import confirm from '@inquirer/confirm';
import spinnerFactory from 'node-spinner';
const spinner = spinnerFactory();
import cursor from 'cli-cursor';
import progress from 'progress';
spinner.set('|/-\\');

/**
 * Cli helper
 */
class Cli {
    constructor(args) {
        this.args = args;
        this.data = [];
    }

    /*
     * emojis
     */
    static get update() {
        return '⏱';
    }

    static get print() {
        return '🖨';
    }

    static get look() {
        return '🔍';
    }

    static get fetch() {
        return '📦';
    }

    static get process() {
        return '⚙️';
    }

    static get output() {
        return '📃';
    }

    static get merge() {
        return '📎';
    }

    static get party() {
        return '🥑';
    }

    /**
     * ask
     * @param message
     * @returns {Promise}
     */
    static async ask(message) {
        let answer = await confirm({ message, default: true });

        if (!answer) throw new Error('Declined');
    }

    /**
     * print
     * @param string
     */
    static out(string) {
        if (Cli.quiet) return;
        process.stdout.write(string);
    }

    /**
     * print done message
     */
    static done() {
        Cli.out(pc.green(`\n${Cli.party}  Finished!\n`));
    }

    /**
     * print a warning
     * @param message
     */
    static warn(message) {
        Cli.out(pc.bgWhite(pc.black(` Warning: ${message} `)) + "\n");
    }

    /**
     * create a new bar
     * @param message
     * @param total
     * @returns {*}
     */
    static bar(message, total) {
        Cli.resolve(false);

        if (Cli.quiet) return Cli.promise();

        this.active = {
            started: new Date(),
            message: pc.bold(pc.gray(`\r${message}... `)),
            bar: new progress(`${message} (:current/:total) [:bar] :percent - :minutesm left`, {
                total,
                clear: true,
                width: 40,
                renderThrottle: 100
            }),
            interval: setInterval(() => {
                if (!Cli.active.bar || Cli.active.bar.complete) return clearInterval(Cli.active.interval);
                Cli.tick(0);
            }, 1000)
        };

        this.tick();
        return Cli.promise();
    }

    /**
     * bar tick
     * @param amount
     */
    static tick(amount = 0) {
        if (!Cli.active.bar || !Cli.active.started) return;

        let left;

        if (Cli.active.bar.curr > 0) {
            let elapsed = Math.ceil((new Date() - Cli.active.started) / 1000);
            left = ((elapsed / Cli.active.bar.curr) * (Cli.active.bar.total - Cli.active.bar.curr)) / 60;
            left = left < 1 ? `<1` : Math.ceil(left);
        } else {
            left = 0;
        }

        Cli.active.bar.tick(amount, {
            minutes: left
        });
    }

    /**
     * advance an existing bar
     */
    static advance() {
        Cli.tick(1);
    }

    /**
     * create a new list, including a spinner
     * @param message
     * @returns {*}
     */
    static list(message) {
        Cli.resolve(false);

        this.active = {message: pc.bold(pc.gray(`\r${message}... `))};
        this.active.interval = setInterval(() => {
            Cli.out(Cli.active.message + pc.bold(pc.blue(spinner.next())));
        }, 100);

        return Cli.promise();
    }

    /**
     * stop a list item with a check mark
     * @returns {*}
     */
    static mark() {
        Cli.resolve();
        if (Cli.active) Cli.out(`${Cli.active.message}` + pc.green(`✓\n`));

        return Cli.promise();
    }

    /**
     * stop a list item with an x
     * @param message
     * @param error
     * @returns {*}
     */
    static x(message = false, error = false) {
        Cli.resolve();
        if (Cli.active) Cli.out(`${Cli.active.message}` + pc.red(`✗\n`));

        if (message) Cli.error(message, error);
        return Cli.promise();
    }

    /**
     * stop and resolve a list or bar
     */
    static resolve(show = true) {
        cursor.toggle(show);
        if (Cli.active && Cli.active.interval) clearInterval(Cli.active.interval);
    }

    /**
     * show an error message
     * @param message
     * @param error
     * @returns {*}
     */
    static error(message, error) {
        Cli.resolve();

        if (message instanceof Error) {
            error = error ?? message;
            message = message.message;
        }

        Cli.out(`Error: ${pc.red(message)}` + '\n');
        if (error && Cli.verbose) console.log(error);

        process.exit(1);
    }

    /**
     * get a promise (for chaining promises)
     * @returns {Promise}
     */
    static promise() {
        return new Promise(resolve => {
            resolve();
        });
    }

    /**
     * parse the args and return the project argument
     * @returns {*}
     */
    project() {
        if (!this.args[0] && !this.data.project) return null;

        if (this.data.project) return this.data.project;

        let projects = [...new Set(this.args.filter(arg => isNaN(new Number(arg))))];
        this.args = this.args.filter(arg => !projects.includes(arg));

        if(projects.length == 0)
            return null;

        return this.data.project = projects;
    }

    /**
     * parse the args and return an array of issues
     * @returns {*}
     */
    iids() {
        if (this.data.iids) return this.data.iids;

        this.data.iids = [...new Set(this.args.map((issue) => {
            if (issue.indexOf(',') === -1) return issue;
            return issue.split(',');
        }).flat())];

        if (this.data.iids.length === 0) return null;

        return this.data.iids;
    }
}

export default Cli;