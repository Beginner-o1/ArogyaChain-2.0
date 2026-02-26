const express = require("express");
const multer = require("multer");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Backend is running" });
});

// File upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const fileBuffer = req.file.buffer;
        const hash = crypto
            .createHash("sha256")
            .update(fileBuffer)
            .digest("hex");

        // TODO: Add IPFS upload here
        // For now, returning mock CID
        const mockCID = `Qm${hash.substring(0, 44)}`;

        res.json({
            success: true,
            message: "File received",
            hash: `0x${hash}`,
            cid: mockCID,
            filename: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Upload failed", details: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
