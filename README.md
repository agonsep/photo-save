# Basic Node.js Application

A super basic Node.js HTTP server application.

## Features

- Simple HTTP server using Node.js built-in modules
- Basic routing (home, about, API endpoint)
- HTML pages with basic styling
- JSON API endpoint
- 404 error handling
- Graceful shutdown handling

## Getting Started

### Prerequisites

- Node.js installed on your system

### Installation

1. Navigate to the project directory:
   ```bash
   cd c:\dev\photo-save
   ```

2. No additional dependencies needed - uses only Node.js built-in modules!

### Running the Application

```bash
npm start
```

Or directly with Node.js:

```bash
node app.js
```

The server will start on `http://localhost:3000`

### Available Routes

- **GET /** - Home page with navigation links
- **GET /about** - About page with app information
- **GET /api/hello** - JSON API endpoint returning a hello message
- **All other routes** - 404 error page

### Stopping the Server

Press `Ctrl+C` in the terminal to gracefully stop the server.

## Project Structure

```
photo-save/
├── app.js          # Main application file
├── package.json    # Project configuration
└── README.md       # This file
```

## Next Steps

This basic app can be extended with:
- Express.js framework for easier routing
- Database integration
- Static file serving
- Authentication
- And much more!"# photo-save" 
