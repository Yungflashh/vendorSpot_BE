// routes/download.routes.ts
// Add this new route file to serve digital product downloads

import express from 'express';
import path from 'path';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Serve digital product downloads (protected route)
router.get('/downloads/:filename', authenticate, (req, res) => {
  const { filename } = req.params;
  
  // Security: Only allow specific file extensions
  const allowedExtensions = ['.pdf', '.zip', '.mp4', '.mp3'];
  const fileExt = path.extname(filename).toLowerCase();
  
  if (!allowedExtensions.includes(fileExt)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type',
    });
  }
  
  // Security: Prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(__dirname, '../public/downloads', safeFilename);
  
  // Check if file exists
  const fs = require('fs');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'File not found',
    });
  }
  
  // Set appropriate headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  
  // Stream the file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error downloading file',
        });
      }
    }
  });
});

export default router;