const express = require("express");
const multer = require("multer");
const cors = require("cors");
const crypto = require("crypto");
const FormData = require("form-data");
const axios = require("axios");
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

        // Upload to Pinata
        const formData = new FormData();
        formData.append("file", fileBuffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });
        formData.append("pinataMetadata", JSON.stringify({
            name: req.file.originalname,
        }));

        const pinataRes = await axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            formData,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PINATA_JWT}`,
                    ...formData.getHeaders(),
                },
                maxBodyLength: Infinity,
            }
        );

        const cid = pinataRes.data.IpfsHash;

        res.json({
            success: true,
            message: "File pinned to IPFS",
            hash: `0x${hash}`,
            cid,
            url: `https://gateway.pinata.cloud/ipfs/${cid}`,
            filename: req.file.originalname,
            size: req.file.size,
        });
    } catch (error) {
        console.error("Upload error:", error?.response?.data || error.message);
        res.status(500).json({ error: "Upload failed", details: error?.response?.data || error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});