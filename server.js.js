const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database
const db = new sqlite3.Database('./homework.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Table for homework items
        db.run(`
            CREATE TABLE IF NOT EXISTS homework (
                id TEXT PRIMARY KEY,
                task TEXT,
                subject TEXT,
                date TEXT,
                status TEXT
            )
        `);

        // Table for system metadata (Marquee text and last update timestamp)
        db.run(`
            CREATE TABLE IF NOT EXISTS meta (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // Seed initial data if empty
        db.get("SELECT COUNT(*) as count FROM homework", [], (err, row) => {
            if (row && row.count === 0) {
                const defaultData = [
                    ["PTH001", "普通話習作預備稿", "普通話", "5/10/2026", "待截止"],
                    ["CHIN007", "作文改正", "中國語文", "30/9/2026", "已截止"],
                    ["CHIN009", "課後延伸", "中國語文", "5/10/2026", "待截止"],
                    ["ENG010", "VRSS p.47-48", "English Language", "7/10/2026", "待截止"],
                    ["CHIN006", "課文測驗", "中國語文", "22/10/2026", "晚點"],
                    ["ENG009", "Borrow an English Book", "English Language", "30/9/2026", "已截止"],
                    ["BIO003", "WS p.7-10", "Biology", "2/10/2026", "已截止"],
                    ["HIST002", "Reading Task", "History", "30/9/2026", "已截止"],
                    ["GOEG005", "Complete the WHOLE map reading workbook", "Geography", "6/10/2026", "待截止"],
                    ["E&RE001", "Note P.5 (Case 2)", "倫理與宗教", "30/9/2026", "已截止"],
                    ["VA005", "Carton Carving", "Visual Arts", "8/10/2026", "待截止"],
                    ["CHIN008", "詳盡閱讀報告", "中國語文", "20/10/2026", "待截止"],
                    ["ENG011", "Unseen Dictation and Vocabulary Quiz", "English Language", "9/10/2026", "待截止"],
                    ["ENG012", "GB Unit 4", "English Language", "2/10/2026", "已截止"],
                    ["MATH009", "", "", "", ""],
                    ["CHIN004", "隨筆 2", "中國語文", "7/10/2026", "待截止"]
                ];

                const stmt = db.prepare("INSERT INTO homework (id, task, subject, date, status) VALUES (?, ?, ?, ?, ?)");
                defaultData.forEach(item => stmt.run(item));
                stmt.finalize();

                db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('marquee', '📢 歡迎使用 3J 功課大屏！請準時交功課，勤奮學習！')");
                db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('lastUpdate', '')");
            }
        });
    });
}

// GET API: Retrieve all homework and system settings
app.get('/api/homework', (req, res) => {
    db.all("SELECT * FROM homework", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all("SELECT * FROM meta", [], (err, metaRows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const meta = {};
            metaRows.forEach(row => meta[row.key] = row.value);

            res.json({
                homework: rows,
                marqueeText: meta.marquee || '📢 歡迎使用 3J 功課大屏！請準時交功課，勤奮學習！',
                lastUpdateTime: meta.lastUpdate || ''
            });
        });
    });
});

// POST API: Save all homework items and meta details
app.post('/api/homework', (req, res) => {
    const { homework, marqueeText, lastUpdateTime } = req.body;

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run("DELETE FROM homework");
        const stmt = db.prepare("INSERT INTO homework (id, task, subject, date, status) VALUES (?, ?, ?, ?, ?)");
        homework.forEach(item => {
            stmt.run([item.id || '', item.task || '', item.subject || '', item.date || '', item.status || '']);
        });
        stmt.finalize();

        if (marqueeText !== undefined) {
            db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('marquee', ?)", [marqueeText]);
        }
        if (lastUpdateTime !== undefined) {
            db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('lastUpdate', ?)", [lastUpdateTime]);
        }

        db.run("COMMIT", (err) => {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});