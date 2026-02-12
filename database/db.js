const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function initDB() {
    const db = await open({
        filename: './database/service.db',
        driver: sqlite3.Database
    });

await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        mail TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
`);

await db.exec(`
    CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        url TEXT NOT NULL,
        public_id TEXT NOT NULL,
        original_name TEXT,
        format TEXT,
        width INTEGER,
        height INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
`);

await db.exec(`
    CREATE TABLE IF NOT EXISTS transformations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_id INTEGER,
        user_id INTEGER, -- დავამატეთ ეს სვეტი
        transformed_url TEXT NOT NULL,
        transformation_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (image_id) REFERENCES images (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
`);

    return db;
}

module.exports = initDB;