const _ = require('underscore');

const Table = require('markdown-table');
const Base = require('./base');

const format = {
    headline: h => `\n### ${h}\n`,
    warning: w => `${w}`
};

/**
 * invoice, code heavily based on markdown.js
 */
class invoice extends Base {
    constructor(config, report) {
        super(config, report);
        this.format = format;
        this.invoiceCurrency = this.config.get('invoiceCurrency');
        this.invoiceCurrencyPerHour = this.config.get('invoiceCurrencyPerHour');
        this.invoiceVAT = this.config.get('invoiceVAT');
        this.invoiceCurrencyMaxUnit = this.config.get('invoiceCurrencyMaxUnit');
        this.totalhForInvoice = this.spent / 3600.0;
        this.totalForInvoiceExkl = this.totalhForInvoice * this.invoiceCurrencyPerHour;
        this.totalForInvoiceMwst = this.totalForInvoiceExkl * this.invoiceVAT;
        this.totalForInvoice = this.totalForInvoiceExkl + this.totalForInvoiceMwst;
        // round
        this.totalForInvoice = Math.round(this.totalForInvoice/this.invoiceCurrencyMaxUnit)*this.invoiceCurrencyMaxUnit;
    }


    concat(data, separator) {
        if(null == data) {
            return "";
        }
        if(!Array.isArray(data)) {
            return data.replace(/_/g, " ");
        }
        let data2 = [];
        data.forEach(el => data2.push(this.concat(el, separator)));
        return data2.join(separator);
    }

    makeStats() {

        let stats = '';

        _.each(this.stats, (time, name) => stats += `\n* **${name}**: ${time}`);
        stats += `\n`;

        if (this.projects.length > 1) {
            _.each(this.projects, (time, name) => stats += `\n* **${name.red}**: ${time}`);
            stats += `\n`;
        }
        // REMOVE
        // _.each(this.users, (time, name) => stats += `\n* **${name}**: ${time}`);
        let to = this.concat(this.config.get('invoiceAddress'), '</br>');
        let from = this.concat(this.config.get('invoiceSettings').from, '</br>');
        let opening = this.concat(this.config.get('invoiceSettings').opening, '</br>');
        let closing = this.concat(this.config.get('invoiceSettings').closing, '</br>');
        let positionText = this.concat(this.config.get('invoiceSettings').positionText, '</br>');

        this.out += 
`<div class="senderBox">${from}</div>

<div class="addressBox">
<div class="addressFrom">${this.config.get('invoiceSettings').fromShort}</div>
<div class="addressTo">${to}</div>
</div>
<div class="dateBox">${this.config.get('invoiceDate')}</div>

# ${this.config.get('invoiceTitle')}

${opening}

<div class="positionBox">
<div class="positionDesc">${positionText} (${this.totalhForInvoice.toFixed(2)} Stunden zu ${this.invoiceCurrencyPerHour} ${this.invoiceCurrency})</div>
<div class="positionValue">${this.invoiceCurrency} ${this.totalForInvoiceExkl.toFixed(2)}</div>
<div class="positionDesc">MWST (${this.invoiceVAT*100}%)</div>
<div class="positionValue">${this.invoiceCurrency} ${this.totalForInvoiceMwst.toFixed(2)}</div>
<div class="positionDescTot">Rechnungsbetrag inkl. MWST</div>
<div class="positionValueTot">${this.invoiceCurrency} ${this.totalForInvoice.toFixed(2)}</div>
</div>

${this.config.get('invoiceSettings').bankAccount}

${closing}


<h1 style="page-break-before: always;"><br/><br/>Stundenrapport</h1>`;

        this.headline('Total');
        this.write(stats.substr(1));
    }

    makeIssues() {
        this.headline('Issues');

        if (this.report.issues.length === 0)
            return this.warning('No issues found');

        let issues = [this.config.get('issueColumns').map(c => c.replace('_', ' '))];
        this.report.issues.forEach(issue => issues.push(this.prepare(issue, this.config.get('issueColumns'))));

        this.write(Table(issues));
    }

    makeMergeRequests() {
        this.headline('Merge Requests');

        if (this.report.mergeRequests.length === 0)
            return this.warning('No merge requests found');

        let mergeRequests = [this.config.get('mergeRequestColumns').map(c => c.replace('_', ' '))];
        this.report.mergeRequests.forEach(mergeRequest => mergeRequests.push(this.prepare(mergeRequest, this.config.get('mergeRequestColumns'))));

        this.write(Table(mergeRequests));
    }

    makeRecords() {
        this.headline('Details');

        let times = [this.config.get('recordColumns').map(c => c.replace('_', ' '))];
        this.times.forEach(time => times.push(this.prepare(time, this.config.get('recordColumns'))));

        this.write(Table(times));
    }
}

module.exports = invoice;