const fs = require('fs');
const path = require('path');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const before = content;
      content = content.replace(/from\s+(['"])(\.\.?\/[^"]+?)\.js\1/g, 'from $1$2$1');
      content = content.replace(/import\(\s*(['"])(\.\.?\/[^"]+?)\.js\1\s*\)/g, 'import($1$2$1)');
      if (content !== before) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

walk(path.join(__dirname, 'src'));
