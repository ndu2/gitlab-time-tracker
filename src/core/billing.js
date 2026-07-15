/**
 * Charge ratio for a set of GitLab labels, driven by the freeLabels/
 * halfPriceLabels config. Free wins over half-price if both match.
 * @param {string[]} labels
 * @param config
 * @returns {number} 0.0, 0.5 or 1.0
 */
export default function chargeRatio(labels, config) {
    let free = config.get('freeLabels') ?? [];
    let halfPrice = config.get('halfPriceLabels') ?? [];

    if (labels.some(label => free.includes(label))) return 0.0;
    if (labels.some(label => halfPrice.includes(label))) return 0.5;
    return 1.0;
}
