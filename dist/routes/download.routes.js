"use strict";
// routes/download.routes.ts
// Add this new route file to serve digital product downloads
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Serve digital product downloads (protected route)
router.get('/downloads/:filename', auth_1.authenticate, (req, res) => {
    const { filename } = req.params;
    // Security: Only allow specific file extensions
    const allowedExtensions = ['.pdf', '.zip', '.mp4', '.mp3'];
    const fileExt = path_1.default.extname(filename).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid file type',
        });
    }
    // Security: Prevent directory traversal
    const safeFilename = path_1.default.basename(filename);
    const filePath = path_1.default.join(__dirname, '../public/downloads', safeFilename);
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
exports.default = router;
//# sourceMappingURL=download.routes.js.map