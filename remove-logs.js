const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('c:/Users/yanni/Development/projet_philippe/apps/client/src');
let modifiedFileCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;
    
    // Remove console.log and console.warn calls. 
    // This simple regex handles single line console.logs mostly.
    content = content.replace(/^[ \t]*console\.(log|warn)\(.*?\);?[ \t]*\r?\n/gm, '');
    content = content.replace(/console\.(log|warn)\([^)]*\);?/g, '');

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedFileCount++;
        console.log(`Cleaned: ${file}`);
    }
});

console.log(`Successfully cleaned console.logs in ${modifiedFileCount} files.`);
