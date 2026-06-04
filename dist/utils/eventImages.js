"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withImage = withImage;
const discord_js_1 = require("discord.js");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const DIR = node_path_1.default.join(process.cwd(), 'assets', 'events');
// ── Key → filename ─────────────────────────────────────────────────────────
const KEYS = {
    // Explore events
    combat: 'combat',
    ambush: 'ambush',
    legacy: 'legacy',
    merchant: 'merchant',
    spring: 'spring',
    trap: 'trap',
    altar: 'altar',
    mysterious: 'mysterious',
    villager: 'villager',
    caravan: 'caravan',
    loot: 'loot',
    // Combat outcomes
    boss: 'boss',
    victory: 'victory',
    death: 'death',
    // UI
    rest: 'rest',
    explore: 'explore',
    // Zones
    zone_village: 'zone_village',
    zone_forest: 'zone_forest',
    zone_shrine: 'zone_shrine',
    zone_mines: 'zone_mines',
    zone_wastes: 'zone_wastes',
};
// ── Resolve ────────────────────────────────────────────────────────────────
function resolve(key) {
    const base = KEYS[key] ?? key;
    for (const ext of EXTS) {
        const full = node_path_1.default.join(DIR, `${base}${ext}`);
        if (node_fs_1.default.existsSync(full)) {
            return {
                file: new discord_js_1.AttachmentBuilder(full, { name: `${base}${ext}` }),
                url: `attachment://${base}${ext}`,
            };
        }
    }
    return null;
}
/**
 * Apply an event image to an embed.
 * Returns { embed (with image set if found), files (to pass to editReply) }
 */
function withImage(embed, key) {
    const result = resolve(key);
    if (result) {
        embed.setImage(result.url);
        return { embed, files: [result.file] };
    }
    return { embed, files: [] };
}
