import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Constants
const IMAGES_DIR = path.join(__dirname, 'uploads');
const MAX_IMAGES = 100;

// Ensure upload directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `image-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to manage image rotation (keep only last 100)
function manageImageRotation(): void {
  const files = fs.readdirSync(IMAGES_DIR)
    .filter(file => file.startsWith('image-'))
    .map(file => ({
      name: file,
      path: path.join(IMAGES_DIR, file),
      time: fs.statSync(path.join(IMAGES_DIR, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Sort by newest first

  // Delete old images if we have more than MAX_IMAGES
  if (files.length > MAX_IMAGES) {
    files.slice(MAX_IMAGES).forEach(file => {
      fs.unlinkSync(file.path);
    });
  }
}

// Helper function to get all images sorted by newest first
function getImages(): { name: string; timestamp: number }[] {
  return fs.readdirSync(IMAGES_DIR)
    .filter(file => file.startsWith('image-'))
    .map(file => ({
      name: file,
      timestamp: fs.statSync(path.join(IMAGES_DIR, file)).mtime.getTime()
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

// Extend Request type to include multer's file property
interface MulterRequest extends http.IncomingMessage {
  file?: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  };
}

// Create a simple HTTP server
const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Route handling
  if (pathname === '/' && method === 'GET') {
    // Home page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Photo Save App</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; }
          .container { max-width: 800px; margin: 0 auto; }
          .upload-form { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 5px; }
          input[type="file"] { margin: 10px 0; }
          button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
          .links { margin-top: 20px; }
          .links a { display: block; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Photo Save App</h1>
          <p>Upload and manage your photos (keeps last 100 images)</p>

          <div class="upload-form">
            <h2>Upload Image</h2>
            <form id="uploadForm">
              <input type="file" id="imageFile" accept="image/*" required>
              <button type="submit">Upload</button>
            </form>
            <p id="message"></p>
          </div>

          <div class="links">
            <h2>View Images</h2>
            <ul>
              <li><a href="/latest">View Latest Image</a></li>
              <li><a href="/gallery">View All Images (Gallery)</a></li>
            </ul>
          </div>
        </div>

        <script>
          document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('imageFile');
            const message = document.getElementById('message');

            if (!fileInput.files[0]) {
              message.textContent = 'Please select a file';
              return;
            }

            const formData = new FormData();
            formData.append('image', fileInput.files[0]);

            try {
              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
              });

              const data = await response.json();

              if (response.ok) {
                message.style.color = 'green';
                message.textContent = 'Image uploaded successfully!';
                fileInput.value = '';
              } else {
                message.style.color = 'red';
                message.textContent = data.error || 'Upload failed';
              }
            } catch (error) {
              message.style.color = 'red';
              message.textContent = 'Upload failed: ' + error.message;
            }
          });
        </script>
      </body>
      </html>
    `);
  } else if (pathname === '/api/upload' && method === 'POST') {
    // Image upload endpoint - cast types to bypass Express requirement
    const uploadHandler = upload.single('image');
    uploadHandler(req as any, res as any, (err: any) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }

      const multerReq = req as MulterRequest;
      if (!multerReq.file) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No file uploaded' }));
        return;
      }

      // Manage image rotation after upload
      manageImageRotation();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Image uploaded successfully',
        filename: multerReq.file.filename,
        size: multerReq.file.size
      }));
    });
  } else if (pathname === '/latest' && method === 'GET') {
    // Display latest image
    const images = getImages();
    if (images.length === 0) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Latest Image</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>No images uploaded yet</h1>
          <p><a href="/">← Go Home</a></p>
        </body>
        </html>
      `);
      return;
    }

    const latestImage = images[0];
    const currentTime = new Date().toLocaleString();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Latest Image</title>
        <meta http-equiv="refresh" content="15">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          img { max-width: 100%; height: auto; border: 2px solid #ddd; border-radius: 8px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .refresh-indicator { color: #666; font-size: 14px; margin-top: 10px; }
          .timestamp-info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .timestamp-info p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Latest Image</h1>
          <div class="timestamp-info">
            <p><strong>Image Uploaded:</strong> ${new Date(latestImage.timestamp).toLocaleString()}</p>
            <p><strong>Last Refreshed:</strong> ${currentTime}</p>
            <p class="refresh-indicator">Auto-refreshing every 15 seconds...</p>
          </div>
          <img src="/images/${latestImage.name}" alt="Latest uploaded image">
          <p><a href="/">← Go Home</a> | <a href="/gallery">View Gallery</a></p>
        </div>
      </body>
      </html>
    `);
  } else if (pathname === '/gallery' && method === 'GET') {
    // Gallery view - list all images
    const images = getImages();

    const imageCards = images.map(img => `
      <div class="image-card">
        <img src="/images/${img.name}" alt="${img.name}">
        <p>${new Date(img.timestamp).toLocaleString()}</p>
      </div>
    `).join('');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Image Gallery</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 1400px; margin: 0 auto; }
          h1 { text-align: center; }
          .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
          .image-card { border: 2px solid #ddd; border-radius: 8px; padding: 10px; background: #f9f9f9; cursor: pointer; transition: transform 0.2s; }
          .image-card:hover { transform: scale(1.05); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
          .image-card img { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; }
          .image-card p { text-align: center; margin: 10px 0 0 0; font-size: 12px; color: #666; }
          .nav { text-align: center; margin-bottom: 20px; }
          .count { text-align: center; color: #666; margin-bottom: 10px; }
          .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); }
          .modal-content { margin: auto; display: block; max-width: 90%; max-height: 90%; margin-top: 2%; }
          .close { position: absolute; top: 20px; right: 40px; color: #fff; font-size: 40px; font-weight: bold; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="nav">
            <a href="/">← Go Home</a> | <a href="/latest">View Latest</a>
          </div>
          <h1>Image Gallery</h1>
          <p class="count">Total Images: ${images.length} / ${MAX_IMAGES}</p>
          ${images.length === 0 ? '<p style="text-align: center;">No images uploaded yet</p>' : `
          <div class="gallery">
            ${imageCards}
          </div>
          `}
        </div>

        <div id="imageModal" class="modal">
          <span class="close">&times;</span>
          <img class="modal-content" id="modalImage">
        </div>

        <script>
          const modal = document.getElementById('imageModal');
          const modalImg = document.getElementById('modalImage');
          const cards = document.querySelectorAll('.image-card');
          const close = document.querySelector('.close');

          cards.forEach(card => {
            card.addEventListener('click', function() {
              modal.style.display = 'block';
              modalImg.src = this.querySelector('img').src;
            });
          });

          close.addEventListener('click', function() {
            modal.style.display = 'none';
          });

          modal.addEventListener('click', function(e) {
            if (e.target === modal) {
              modal.style.display = 'none';
            }
          });
        </script>
      </body>
      </html>
    `);
  } else if (pathname?.startsWith('/images/') && method === 'GET') {
    // Serve individual images
    const imageName = pathname.substring(8); // Remove '/images/'
    const imagePath = path.join(IMAGES_DIR, imageName);

    if (fs.existsSync(imagePath) && imageName.startsWith('image-')) {
      const ext = path.extname(imageName).toLowerCase();
      const contentTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';
      const imageBuffer = fs.readFileSync(imagePath);

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(imageBuffer);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Image not found');
    }
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
const PORT: number = parseInt(process.env.PORT || '3000', 10);
const HOST: string = 'localhost';

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
