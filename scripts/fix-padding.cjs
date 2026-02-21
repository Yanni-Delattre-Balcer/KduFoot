const fs = require('fs');

const editFile = (file) => {
    let content = fs.readFileSync(file, 'utf8');

    // Remove italic & gras combinations on empty states safely
    content = content.replace(/font-medium italic/g, 'font-medium'); 
    content = content.replace(/font-semibold italic/g, 'font-semibold');
    
    // Reduce massive padding blocks
    content = content.replace(/py-20/g, 'py-8');
    content = content.replace(/p-12/g, 'py-6 px-4');
    content = content.replace(/py-16/g, 'py-8');

    fs.writeFileSync(file, content);
};

editFile('apps/client/src/pages/dashboard/index.tsx');
editFile('apps/client/src/pages/sessions/planner.tsx');
editFile('apps/client/src/pages/exercises/index.tsx');
