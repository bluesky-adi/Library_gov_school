/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { connectDatabase } from './server_db';
import app from './app';

const PORT = 3000;

// Compile Vite assets or configure production fallback route
async function initServer() {
  // Connect database on boot as a background task to establish connection without blocking listen()
  try {
    await connectDatabase();
    console.log("Database connection routine completed.");
  } catch (err) {
    console.error("Database connection failed on startup:", err);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log("Loading Vite Dev Middlewares on Port 3000...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving Production Compiles from dist/");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ramdiri Portal server active running on http://localhost:${PORT}`);
  });
}

initServer().catch(err => {
  console.error("Critical server startup fault:", err);
});
