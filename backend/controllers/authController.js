const pool = require('../config/db');
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Kullanıcıyı veritabanında arıyoruz
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE username = ?",
            [username]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: "Kullanıcı bulunamadı" });
        }

        const user = rows[0];

        // Şifre doğrulama
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Şifre hatalı" });
        }

        // Session'a kullanıcıyı kaydet
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        res.json({ message: "Giriş başarılı", user: req.session.user });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Sunucu hatası" });
    }
};
exports.me = (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Giriş yapılmamış" });
    }
    res.json({ user: req.session.user });
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Çıkış yapıldı" });
    });
};

