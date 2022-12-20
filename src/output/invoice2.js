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
class invoice2 extends Base {
    constructor(config, report) {
        super(config, report);
        this.format = format;
        this.invoiceCurrency = this.config.get('invoiceCurrency');
        this.invoiceCurrencyPerHour = this.config.get('invoiceCurrencyPerHour');
        this.invoiceVAT = this.config.get('invoiceVAT');
        this.invoiceText = this.config.get('invoiceText') ? this.config.get('invoiceText') : '';
        this.invoicePositionText = this.config.get('invoicePositionText');
        this.invoicePositionExtra = this.config.get('invoicePositionExtra');
        this.invoicePositionExtraTexts = this.config.get('invoicePositionExtraText');
        this.invoicePositionExtraValues = this.config.get('invoicePositionExtraValue').map(
            (v) => {
                const value = parseFloat(v);
                return value > 0? value: 0; // NaN -> 0
            });
        this.invoicePositionExtraTotal = 0.0;
        this.invoicePositionExtraValues.forEach(v => (this.invoicePositionExtraTotal += v));

        this.invoiceCurrencyMaxUnit = this.config.get('invoiceCurrencyMaxUnit');
        this.invoiceTimeMaxUnit = this.config.get('invoiceTimeMaxUnit');

        this.invoicePositions = {}; //key=iid, value=[text, total H, Rate, Total]

        Object.keys(this.daysNew).forEach(
            k => {
                let day = this.daysNew[k];
                day.forEach(
                    (dayReport) => {
                        let iid = dayReport.getIid();
                        if(!this.invoicePositions[iid]) {
                            this.invoicePositions[iid] = [dayReport.getTitle(), 0.0, this.invoiceCurrencyPerHour * dayReport.getChargeRatio(), 0.0];
                        }
                        this.invoicePositions[iid][1] += dayReport.getSpent(this.invoiceTimeMaxUnit) / 3600;
                        this.invoicePositions[iid][3] = Math.round((this.invoicePositions[iid][1] * this.invoicePositions[iid][2]) * 100) * 0.01;
                    }
                );
            });
        
        let invoiceTotal = this.invoicePositionExtraTotal;
        Object.keys(this.invoicePositions).forEach(
            k => {
                invoiceTotal += this.invoicePositions[k][3];
            }
        )
        this.totalForInvoiceExkl = invoiceTotal;
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
        let positions ="";
        let positionIids = Object.keys(this.invoicePositions);
        positionIids.sort();
        positionIids.forEach(
            k => {
                // text, total H, Rate, Total
                let position = this.invoicePositions[k];
                positions += 
`<div class="positionDesc">${position[0]}: ${position[1].toFixed(2)}h (${position[2]} ${this.invoiceCurrency}/h)</div>
<div class="positionValue">${this.invoiceCurrency} ${position[3].toFixed(2)}</div>
`;
            }
        );

        let extra = "";
        if(this.invoicePositionExtra || this.invoicePositionExtraTotal > 0) {
            if(this.invoicePositionExtra) {
                extra += `<div class="position">${this.invoicePositionExtra}</div>`;
            }
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

${opening} ${this.invoiceText}

<div class="positionBox">
<div class="position">${this.invoicePositionText}</div>
${positions}
${extra}
<div class="positionDescTot">Summe Netto</div>
<div class="positionValueTot">${this.invoiceCurrency} ${this.totalForInvoiceExkl.toFixed(2)}</div>
<div class="positionDesc">MWST (${this.invoiceVAT*100}%)</div>
<div class="positionValue">${this.invoiceCurrency} ${this.totalForInvoiceMwst.toFixed(2)}</div>
<div class="positionDescTot">Rechnungsbetrag inkl. MWST</div>
<div class="positionValueTot">${this.invoiceCurrency} ${this.totalForInvoice.toFixed(2)}</div>
</div>

${this.config.get('invoiceSettings').bankAccount}

${closing}


<div class="qr-div">${svg.toString()}</div>`

    }

    makeIssues() {
    }

    makeMergeRequests() {
    }

    makeRecords() {
        this.out += `

<h1 style="page-break-before: always;"><br/><br/>Stundenrapport</h1>`;

        let timesNew = [['Datum', 'Beschreibung', 'Stunden']];
        let daysNew = Object.keys(this.daysNew);
        daysNew.sort();
        daysNew.forEach(
            k => {
                let day = this.daysNew[k];
                day.forEach(
                    (dayReport) => {
                        let notesLi = "";

                        dayReport.getNotes().forEach(
                        (note) => (notesLi+=`<li>${note}</li>`));
                        if(notesLi !== "") {
                            notesLi = `<ul>${notesLi}</ul>`;
                        }
                        timesNew.push([dayReport.getDate().format(this.config.get('dateFormat')),
                             dayReport.getTitle() + notesLi, 
                            this.config.toHumanReadable(dayReport.getSpent(this.invoiceTimeMaxUnit), 'records')                                                        
                        ]);
                    }
                );
            });
        this.write(`<style>
table th:first-of-type { width: 12%; }
table th:nth-of-type(2) { width: 78%; }
table th:nth-of-type(3) { width: 10%; }
</style>`);

        this.write(Table(timesNew, { align: ['l', 'l', 'r'] }));



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

}

module.exports = invoice2;