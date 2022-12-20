const _ = require('underscore');

const Table = require('markdown-table');
const Base = require('./base');

const SwissQRBill = require("swissqrbill");

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
        this.invoicePositionText = this.config.get('invoicePositionText');
        this.invoicePositionExtraTexts = this.config.get('invoicePositionExtraText');
        this.invoicePositionExtraValues = this.config.get('invoicePositionExtraValue').map(
            (v) => {
                const value = parseFloat(v);
                return value > 0? value: 0; // NaN -> 0
            });
        this.invoicePositionExtraTotal = 0.0;
        this.invoicePositionExtraValues.forEach(v => (this.invoicePositionExtraTotal += v));



        this.invoiceCurrencyMaxUnit = this.config.get('invoiceCurrencyMaxUnit');
        this.totalhForInvoice = (this.spent-this.spentFree-(this.spentHalfPrice*0.5)) / 3600.0;
        // round subtotals to 0.01 and total to invoiceCurrencyMaxUnit.
        let invoiceTotal = this.totalhForInvoice * this.invoiceCurrencyPerHour + this.invoicePositionExtraTotal;
        this.totalForInvoiceH = Math.round(this.totalhForInvoice * this.invoiceCurrencyPerHour * 100) * 0.01;
        this.totalForInvoiceExkl = Math.round(invoiceTotal * 100) * 0.01;
        this.totalForInvoiceMwst = Math.round(invoiceTotal * this.invoiceVAT * 100) * 0.01;
        this.totalForInvoice = Math.round((this.totalForInvoiceExkl + this.totalForInvoiceMwst)/this.invoiceCurrencyMaxUnit)*this.invoiceCurrencyMaxUnit;
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
        let to = this.concat(this.config.get('invoiceAddress'), '<br />');
        let from = this.concat(this.config.get('invoiceSettings').from, '<br />');
        let opening = this.concat(this.config.get('invoiceSettings').opening, '<br />');
        let closing = this.concat(this.config.get('invoiceSettings').closing, '<br />');
       
        // QR bill
        let endOfZipPos = this.config.get('invoiceSettings').from[3].search("[ _]");
        let zip = this.config.get('invoiceSettings').from[3].substring(0, endOfZipPos);
        let city = this.config.get('invoiceSettings').from[3].substring(endOfZipPos + 1);
        
        // debitor
        let nDebitorAddressFields = Array.isArray(this.config.get('invoiceAddress'))? this.config.get('invoiceAddress').length: -1;
        let nameDebitor = "";
        let zipDebitor = "";
        let cityDebitor = "";
        let addressDebitor = "";
        let countryDebitor = "CH";
        let regexAllUnderscores = /_/g;

        if(nDebitorAddressFields > 0) {
            nameDebitor = this.config.get('invoiceAddress') [0].replace(regexAllUnderscores, " ");
        }
        else {
            nameDebitor = this.config.get('invoiceAddress').toString();
        }

        if(nDebitorAddressFields > 2) {
            let endOfZipPosDebitor = this.config.get('invoiceAddress')[nDebitorAddressFields-1].search("[ _]");
            if(endOfZipPosDebitor > 0){
                zipDebitor = this.config.get('invoiceAddress')[nDebitorAddressFields-1].substring(0, endOfZipPosDebitor).replace(regexAllUnderscores, " ");
                cityDebitor = this.config.get('invoiceAddress')[nDebitorAddressFields-1].substring(endOfZipPosDebitor + 1).replace(regexAllUnderscores, " ");
            }
            addressDebitor = this.config.get('invoiceAddress') [nDebitorAddressFields-2].replace(regexAllUnderscores, " ");
            if(zipDebitor.search("-") > 0)
            {
                let countryZip = zipDebitor.split("-");
                countryDebitor = countryZip[0];
                zipDebitor = countryZip[1];
            }
        }

        const data = {
            currency: "CHF",
            amount: this.totalForInvoice,
            additionalInformation: this.config.get('invoiceReference'),
            creditor: {
            name: this.config.get('invoiceSettings').from[0],
            address: this.config.get('invoiceSettings').from [2],
            zip: zip,
            city: city,
            account: this.config.get('invoiceSettings').IBAN,
            country: this.config.get('invoiceSettings').Country
            },
            debtor: {
            name: nameDebitor,
            address: addressDebitor,
            zip: zipDebitor,
            city: cityDebitor,
            country: countryDebitor
            }
        };
        const options = {
            language: "DE"
        };
        const svg = new SwissQRBill.SVG(data, options);
        // make svg scalable, by adding viewBox and removing height/width attributes
        svg.instance.viewBox(0,0,740,420)
        svg.instance.height("");
        svg.instance.width("");
        let extra = "";
        if(this.invoicePositionExtraTotal > 0) {
            for(var i in this.invoicePositionExtraTexts) {
                extra +=
                `
                <div class="positionDesc">${this.invoicePositionExtraTexts[i]}</div>
                <div class="positionValue">${this.invoiceCurrency} ${this.invoicePositionExtraValues[i].toFixed(2)}</div>
                `;
            }

        }

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
<div class="positionDesc">${this.invoicePositionText} (${this.totalhForInvoice.toFixed(2)} Stunden zu ${this.invoiceCurrencyPerHour} ${this.invoiceCurrency})</div>
<div class="positionValue">${this.invoiceCurrency} ${this.totalForInvoiceH.toFixed(2)}</div>
${extra}
<div class="positionDesc">MWST (${this.invoiceVAT*100}%)</div>
<div class="positionValue">${this.invoiceCurrency} ${this.totalForInvoiceMwst.toFixed(2)}</div>
<div class="positionDescTot">Rechnungsbetrag inkl. MWST</div>
<div class="positionValueTot">${this.invoiceCurrency} ${this.totalForInvoice.toFixed(2)}</div>
</div>

${this.config.get('invoiceSettings').bankAccount}

${closing}


<div class="qr-div">${svg.toString()}</div>


<h1 style="page-break-before: always;"><br/><br/>Stundenrapport</h1>`;

        this.headline('Total');
        //this.write(stats.substr(1));
        this.write(this.config.toHumanReadable(this.spent, 'stats'));
        this.write(this.config.toHumanReadable(this.spentHalfPrice, 'statsHalfPrice'));
        this.write(this.config.toHumanReadable(this.spentFree, 'statsFree'));

        // warnings
        let warnings = '';

        this.timesWarnings.forEach( warning => {
            let stats = this.config.toHumanReadable(warning.data.timeWarning.stats, 'stats');
            let notes = this.config.toHumanReadable(warning.data.timeWarning.notes, 'stats');
            warnings += `\n* ${warning.data.iid} ${warning.data.title}: Difference between stats and notes of ${warning.time}.`;
            warnings += `<br/>Stats: ${stats}, Notes: ${notes}`
        });
        if(warnings != '') {
            this.warningHeadline('Warnings');
            this.warning(warnings+'\n');
        }
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
        this.out += `

<h1 style="page-break-before: always;"><br/><br/>Stundenrapport detailliert</h1>`;
        this.headline('Details');

        let times = [['date', 'iid', 'time']];
        let days = Object.keys(this.days);
        days.sort();
        days.forEach(
            k => {
                let day = this.days[k];
                let refD = this.daysMoment[k].format(this.config.get('dateFormat'));
                let projects = Object.keys(day);
                projects.forEach(
                    p => {
                    let iids = Object.keys(day[p]);
                    iids.sort();
                    iids.forEach(
                        iid => {
                        times.push([refD, iid, this.config.toHumanReadable(day[p][iid], 'records')]);
                        });
                    });
            });
        //let times = [this.config.get('recordColumns').map(c => c.replace('_', ' '))];
        //this.times.forEach(time => times.push(this.prepare(time, this.config.get('recordColumns'))));
        this.write(Table(times));
    }
}

module.exports = invoice;