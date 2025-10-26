const http = require('http');
const url = require('url');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Route handling
  if (path === '/' && method === 'GET') {
    // Home page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Basic Node.js App</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; }
          .container { max-width: 600px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to Your Basic Node.js App!</h1>
          <p>This is a simple HTTP server running on Node.js.</p>
          <ul>
            <li><a href="/about">About</a></li>
            <li><a href="/api/hello">API Hello</a></li>
          </ul>
        </div>
      </body>
      </html>
    `);
  } else if (path === '/about' && method === 'GET') {
    // About page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>About - Basic Node.js App</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; }
          .container { max-width: 600px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>About This App</h1>
          <p>This is a super basic Node.js application that demonstrates:</p>
          <ul>
            <li>Creating an HTTP server</li>
            <li>Basic routing</li>
            <li>Serving HTML content</li>
            <li>JSON API responses</li>
          </ul>
          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
      </html>
    `);
  } else if (path === '/api/hello' && method === 'GET') {
    // Simple API endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Hello from your Node.js API!',
      timestamp: new Date().toISOString(),
      status: 'success'
    }));
  } else {
    // 404 Not Found
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>404 - Page Not Found</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <p><a href="/">← Go Home</a></p>
      </body>
      </html>
    `);
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running at http://${HOST}:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});