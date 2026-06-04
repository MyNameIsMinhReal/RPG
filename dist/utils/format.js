"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bar = bar;
exports.num = num;
exports.hpLabel = hpLabel;
exports.expNext = expNext;
exports.randInt = randInt;
exports.pick = pick;
exports.relativeTime = relativeTime;
exports.truncate = truncate;
exports.padEnd = padEnd;
/** Renders a filled/empty progress bar */
function bar(current, max, len = 10) {
    const filled = Math.max(0, Math.min(len, Math.round((current / max) * len)));
    return '█'.repeat(filled) + '░'.repeat(len - filled);
}
/** Formats a number with commas */
function num(n) {
    return n.toLocaleString('en-US');
}
/** Returns a colored HP string based on percentage */
function hpLabel(hp, maxHp) {
    const pct = hp / maxHp;
    if (pct > 0.6)
        return `🟢 ${hp}/${maxHp}`;
    if (pct > 0.3)
        return `🟡 ${hp}/${maxHp}`;
    return `🔴 ${hp}/${maxHp}`;
}
/** Formats EXP needed to level up */
function expNext(level) {
    return Math.floor(100 * Math.pow(1.4, level - 1));
}
/** Random integer between min and max (inclusive) */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
/** Pick a random element from an array */
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
/** Timestamp helper for Discord */
function relativeTime(unixSeconds) {
    return `<t:${unixSeconds}:R>`;
}
/** Truncate a string with ellipsis */
function truncate(str, maxLen) {
    if (str.length <= maxLen)
        return str;
    return str.slice(0, maxLen - 3) + '...';
}
/** Pad a string to a given length */
function padEnd(str, len) {
    return str.padEnd(len, ' ');
}
