
/**
 * day model of one item
 */
class dayReport {
    constructor(iid, title, spentAt, chargeRatio) {
      this.iid = iid;
      this.title = title;
      this.spentAt = spentAt;
      this.chargeRatio = chargeRatio;

      this.spent = 0;
      this.notes = [];
    }
  
    getIid() {
      return this.iid;
    }

    getTitle() {
      return this.title;
    }
    getSpent(invoiceTimeMaxUnit) {
      if(!invoiceTimeMaxUnit) {
        invoiceTimeMaxUnit = 1.0;
      }
      return Math.ceil(this.spent / invoiceTimeMaxUnit) * invoiceTimeMaxUnit;
    }
    
    getDate() {
      return this.spentAt;
    }
  
    getNotes() {
      return this.notes;
    }
  
    addSpent(seconds) {
      this.spent += seconds;
    }
    addNote(note) {
      if(!this.notes.includes(note)) {
        this.notes.push(note);
      }
    }
    getChargeRatio() {
      return this.chargeRatio;
    }


  }

export default dayReport;
