// scripts/build-scss.js
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, './src/scss');
const destDir = path.join(__dirname, './lib/scss');

fs.mkdirSync(destDir, { recursive: true });

for (const file of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
}