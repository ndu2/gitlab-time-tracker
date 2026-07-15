import { expect } from 'chai';
import Config from '../../src/core/config.js';
import chargeRatio from '../../src/core/billing.js';

describe('chargeRatio', () => {
    let config;

    beforeEach(() => {
        config = new Config();
        config.set('freeLabels', ['pro bono']);
        config.set('halfPriceLabels', ['discount']);
    });

    it('is 0.0 when a label matches freeLabels', () => {
        expect(chargeRatio(['pro bono', 'bug'], config)).to.equal(0.0);
    });

    it('is 0.5 when a label matches halfPriceLabels', () => {
        expect(chargeRatio(['discount', 'bug'], config)).to.equal(0.5);
    });

    it('is 1.0 when no label matches', () => {
        expect(chargeRatio(['bug'], config)).to.equal(1.0);
    });

    it('free wins over half price when both match', () => {
        expect(chargeRatio(['pro bono', 'discount'], config)).to.equal(0.0);
    });

    it('treats missing freeLabels/halfPriceLabels config as empty', () => {
        const bareConfig = new Config();

        expect(chargeRatio(['pro bono'], bareConfig)).to.equal(1.0);
    });
});
