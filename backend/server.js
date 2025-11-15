require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Session tablosu Sequelize üzerinden MySQL içinde tutulacak
const sessionStore = new SequelizeStore({
  db: sequelize,
});


const authRoutes = require('./routes/authRoutes');

app.use('/auth', authRoutes);

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 gün
  }
}));

sessionStore.sync(); // Session tablosunu otomatik oluşturur


const User = require('./models/User');

sequelize.sync()
    .then(() => console.log("Database synced"))
    .catch(err => console.log("DB Error:", err));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Backend çalışıyor!" });
});

// Sunucu başlat
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
