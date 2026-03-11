import fs from 'fs';
import path from 'path';

const filesToClean = [
    "c:/Users/yanni/Development/projet_philippe/apps/client/src/pages/exercises/index.tsx",
    "c:/Users/yanni/Development/projet_philippe/apps/client/src/pages/admin/users-and-permissions.tsx",
    "c:/Users/yanni/Development/projet_philippe/apps/client/src/main.tsx",
    "c:/Users/yanni/Development/projet_philippe/apps/client/src/hooks/use-websocket.tsx",
    "c:/Users/yanni/Development/projet_philippe/apps/client/src/hooks/use-pwa-install.ts",
    "c:/Users/yanni/Development/projet_philippe/apps/client/src/authentication/user-sync.tsx",
    "c:/Users/yanni/Development/projet_philippe/apps/client/src/authentication/providers/dex-provider.tsx",
    "c:/Users/yanni/Development/projet_philippe/apps/client/src/authentication/auth-components.tsx",
    "c:/Users/yanni/Development/projet_philippe/apps/client/src/authentication/providers/user-provider.tsx"
];

let modifiedFileCount = 0;

filesToClean.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;
        
        // Remove console.log and console.warn calls. 
        content = content.replace(/^[ \t]*console\.(log|warn)\(.*?\);?[ \t]*\r?\n/gm, '');
        content = content.replace(/console\.(log|warn)\([^)]*\);?/g, '');

        if (content !== originalContent) {
            fs.writeFileSync(file, content, 'utf8');
            modifiedFileCount++;
            console.log(`Cleaned: ${file}`);
        }
    } catch (e) {
        console.error(`Failed to clean ${file}:`, e.message);
    }
});

console.log(`Successfully cleaned console.logs in ${modifiedFileCount} files.`);
