process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const initDB = require('./database/db'); 
const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');
const authenticateToken = require('./middleware/authMiddleware');

const app = express(); 
app.use(cors()); 
app.use(express.json());
app.use(express.static('public')); 

async function startServer() {
    try {
        const db = await initDB();
        app.set('db', db);
        console.log("Database connected successfully!");

        // Routes
        app.use('/auth', authRoutes);
        app.use('/images', imageRoutes);

        app.get('/test', authenticateToken, (req, res) => {
            res.json({ message: `Hi ${req.user.username}!` });
        });

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

    } catch (error) {
        console.error("Failed to start server:", error);
    }
}

startServer();