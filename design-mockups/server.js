const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DIRECTORY = path.join(__dirname, 'task-layouts');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIRECTORY, req.url === '/' ? 'index.html' : req.url);
  
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'text/plain';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n✨ Design mockups server running!\n`);
  console.log(`   🌐 http://localhost:${PORT}\n`);
  console.log(`   View the 3 task layout options:\n`);
  console.log(`   1. Compact Inline:    http://localhost:${PORT}/option-1-compact-inline.html`);
  console.log(`   2. Condensed Grid:    http://localhost:${PORT}/option-2-condensed-grid.html`);
  console.log(`   3. Dense Table:       http://localhost:${PORT}/option-3-dense-table.html`);
  console.log(`\n   Press Ctrl+C to stop the server\n`);
});
