const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/register', async (req, res) => {
    const { username, mail, password } = req.body;
    const db = req.app.get('db');

    try {
        const existingUser = await db.get('SELECT * FROM users WHERE mail = ?', [mail]);
        if (existingUser) {
            return res.status(400).json({ message: "email is already taken" });
        }

        const result = await db.run(
            'INSERT INTO users (username, mail, password) VALUES (?, ?, ?)',
            [username, mail, password]
        );

        const token = jwt.sign({ id: result.lastID, username, mail }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.status(201).json({ 
            message: "Successfully registered", 
            user: { id: result.lastID, username, mail },
            token 
        });
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
});

router.get('/users', async (req, res) => {
    const db = req.app.get('db');
    try {
        const users = await db.all('SELECT id, username, mail FROM users');
        res.json(users);
    } catch (e) {
        res.status(500).json({ message: "error" });
    }
});

router.get('/users/:id', async (req, res) => {
    const db = req.app.get('db');
    try {
        const user = await db.get('SELECT id, username, mail FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ message: "user not found" });
        res.json(user);
    } catch (e) {
        res.status(500).json({ message: "error" });
    }
});

router.post('/login', async (req, res) => {
    const { mail, password } = req.body;
    const db = req.app.get('db');

    try {
        const user = await db.get('SELECT * FROM users WHERE mail = ? AND password = ?', [mail, password]);

        if (!user) {
            return res.status(401).json({ message: "error data" });
        }

        const token = jwt.sign({ id: user.id, username: user.username, mail: user.mail }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: "Success", token });
    } catch (error) {
        res.status(500).json({ message: "error", error: error.message });
    }
});

module.exports = router;