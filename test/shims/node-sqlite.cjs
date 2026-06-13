// Test-only shim. Vite can't externalize the experimental `node:sqlite` builtin,
// so during tests we alias `node:sqlite` to this real file, which simply
// re-exports the native module at runtime (the --experimental-sqlite flag is on).
const sqlite = require('node:sqlite');
module.exports = sqlite;
module.exports.DatabaseSync = sqlite.DatabaseSync;
