const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const authenticateToken = require('../middleware/authMiddleware');
const axios = require('axios');
const FormData = require('form-data');

const storage = multer.memoryStorage();
const upload = multer({ storage });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const getUserId = (req) => req.user.id || req.user.userId;

router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
    const db = req.app.get('db');
    try {
        if (!req.file) return res.status(400).json({ message: "ფაილი არ არის არჩეული" });

        const formData = new FormData();
        formData.append('file', req.file.buffer, { filename: req.file.originalname });
        formData.append('upload_preset', 'ml_default');

        const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
        const cloudRes = await axios.post(uploadUrl, formData, { headers: formData.getHeaders() });
        const result = cloudRes.data;

        const sql = `INSERT INTO images (user_id, url, public_id, original_name, format, width, height) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const resDb = await db.run(sql, [getUserId(req), result.secure_url, result.public_id, req.file.originalname, result.format, result.width, result.height]);

        res.status(201).json({ id: resDb.lastID, url: result.secure_url });
    } catch (error) {
        res.status(500).json({ message: "ატვირთვის შეცდომა" });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    const db = req.app.get('db');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const offset = (page - 1) * limit;

    try {
        const images = await db.all('SELECT * FROM images ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
        const total = await db.get('SELECT COUNT(*) as count FROM images');

        res.json({
            data: images,
            pagination: {
                total: total.count,
                page: page,
                limit: limit,
                pages: Math.ceil(total.count / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: "შეცდომა" });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    const db = req.app.get('db');
    const imageId = req.params.id;

    try {
        const image = await db.get('SELECT * FROM images WHERE id = ?', [imageId]);
        if (!image) return res.status(404).json({ message: "სურათი ვერ მოიძებნა" });

        const history = await db.all('SELECT * FROM transformations WHERE image_id = ?', [imageId]);

        res.json({ image, history });
    } catch (error) {
        res.status(500).json({ message: "შეცდომა მონაცემების წამოღებისას" });
    }
});

router.post('/:id/transform', authenticateToken, async (req, res) => {
    const db = req.app.get('db');
    const { transformations } = req.body;
    const imageId = req.params.id;

    try {
        const image = await db.get('SELECT * FROM images WHERE id = ?', [imageId]);
        if (!image) return res.status(404).json({ message: "სურათი ბაზაში ვერ მოიძებნა (ID: " + imageId + ")" });

        let tList = [];
        if (transformations.width || transformations.height) {
            tList.push({ width: transformations.width, height: transformations.height, crop: transformations.crop || "scale" });
        }
        if (transformations.rotate) tList.push({ angle: transformations.rotate });
        if (transformations.flip === 'v') tList.push({ angle: "vflip" });
        if (transformations.flip === 'h') tList.push({ flags: "flip" });
        if (transformations.effect) tList.push({ effect: transformations.effect });
        
        if (transformations.watermark) {
            tList.push({ overlay: { font_family: "Arial", font_size: 40, text: "(O_o)" }, gravity: "south_east", opacity: 50, color: "white" });
        }

        const options = { transformation: tList, secure: true };
        if (transformations.format) options.fetch_format = transformations.format;
        if (transformations.compress) options.quality = "auto";

        const transformedUrl = cloudinary.url(image.public_id, options);
        const userId = req.user.id || req.user.userId;
        
        await db.run(
            `INSERT INTO transformations (image_id, user_id, transformed_url, transformation_type) 
             VALUES (?, ?, ?, ?)`,
            [imageId, userId, transformedUrl, JSON.stringify(transformations)]
        );
        // --------------------------------------------------

        res.json({ url: transformedUrl });
    } catch (error) {
        console.error("ბაზაში ჩაწერის შეცდომა:", error.message);
        res.status(500).json({ message: "შეცდომა: " + error.message });
    }
});

module.exports = router;