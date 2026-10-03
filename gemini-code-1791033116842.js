const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database
const db = new sqlite3.Database('./homework.db', (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Connected to SQLite database.");
});

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS homework (
        id TEXT PRIMARY KEY,
        task TEXT,
        subject TEXT,
        date TEXT,
        status TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // Insert initial default marquee & update time if not exists
    db.get(`SELECT value FROM config WHERE key = 'marqueeText'`, (err, row) => {
        if (!row) {
            db.run(`INSERT INTO config (key, value) VALUES ('marqueeText', '📢 歡迎使用 3J 功課大屏！請準時交功課，勤奮學習！')`);
        }
    });

    db.get(`SELECT value FROM config WHERE key = 'lastUpdateTime'`, (err, row) => {
        if (!row) {
            db.run(`INSERT INTO config (key, value) VALUES ('lastUpdateTime', '')`);
        }
    });

    // Seed default homework items if table is empty
    db.get(`SELECT COUNT(*) as count FROM homework`, (err, row) => {
        if (row && row.count === 0) {
            const initialItems = [
                { id: "PTH001", task: "普通話習作預備稿", subject: "普通話", date: "5/10/2026", status: "待截止" },
                { id: "CHIN007", task: "作文改正", subject: "中國語文", date: "30/9/2026", status: "已截止" },
                { id: "CHIN009", task: "課後延伸", subject: "中國語文", date: "5/10/2026", status: "待截止" },
                { id: "ENG010", task: "VRSS p.47-48", subject: "English Language", date: "7/10/2026", status: "待截止" },
                { id: "CHIN006", task: "課文測驗", subject: "中國語文", date: "22/10/2026", status: "晚點" },
                { id: "ENG009", task: "Borrow an English Book", subject: "English Language", date: "30/9/2026", status: "已截止" },
                { id: "BIO003", task: "WS p.7-10", subject: "Biology", date: "2/10/2026", status: "已截止" },
                { id: "HIST002", task: "Reading Task", subject: "History", date: "30/9/2026", status: "已截止" },
                { id: "GOEG005", task: "Complete the WHOLE map reading workbook", subject: "Geography", date: "6/10/2026", status: "待截止" },
                { id: "E&RE001", task: "Note P.5 (Case 2)", subject: "倫理與宗教", date: "30/9/2026", status: "已截止" },
                { id: "VA005", task: "Carton Carving", subject: "Visual Arts", date: "8/10/2026", status: "待截止" },
                { id: "CHIN008", task: "詳盡閱讀報告", subject: "中國語文", date: "20/10/2026", status: "待截止" },
                { id: "ENG011", task: "Unseen Dictation and Vocabulary Quiz", subject: "English Language", date: "9/10/2026", status: "待截止" },
                { id: "ENG012", task: "GB Unit 4", subject: "English Language", date: "2/10/2026", status: "已截止" },
                { id: "MATH009", task: "", subject: "", date: "", status: "" },
                { id: "CHIN004", task: "隨筆 2", subject: "中國語文", date: "7/10/2026", status: "待截止" }
            ];
            const stmt = db.prepare(`INSERT INTO homework (id, task, subject, date, status) VALUES (?, ?, ?, ?, ?)`);
            initialItems.forEach(item => stmt.run(item.id, item.task, item.subject, item.date, item.status));
            stmt.finalize();
        }
    });
});

// API Routes
app.get('/api/data', (req, res) => {
    db.all(`SELECT * FROM homework`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(`SELECT * FROM config`, [], (err, configs) => {
            if (err) return res.status(500).json({ error: err.message });
            const configMap = {};
            configs.forEach(c => configMap[c.key] = c.value);
            res.json({
                homeworkList: rows,
                marqueeText: configMap.marqueeText || '',
                lastUpdateTime: configMap.lastUpdateTime || ''
            });
        });
    });
});

app.post('/api/save', (req, res) => {
    const { homeworkList, marqueeText, lastUpdateTime } = req.body;

    db.serialize(() => {
        db.run(`DELETE FROM homework`);
        const stmt = db.prepare(`INSERT INTO homework (id, task, subject, date, status) VALUES (?, ?, ?, ?, ?)`);
        homeworkList.forEach(item => {
            stmt.run(item.id || '', item.task || '', item.subject || '', item.date || '', item.status || '');
        });
        stmt.finalize();

        db.run(`REPLACE INTO config (key, value) VALUES ('marqueeText', ?)`, [marqueeText || '']);
        db.run(`REPLACE INTO config (key, value) VALUES ('lastUpdateTime', ?)`, [lastUpdateTime || '']);

        res.json({ success: true, message: "Data synced across users successfully!" });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});