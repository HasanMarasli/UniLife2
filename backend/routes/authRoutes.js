const express = require('express');
const router = express.Router();

// require controller and middleware as raw modules
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// pull handlers (safe even if authController is undefined)
const { login, me, logout } = authController || {};

// small helper to assert a value is a function
function assertIsFunction(fn, name, pathHint) {
	console.error; // keep linter quiet if unused
	if (typeof fn !== 'function') {
		console.error(`${name} is not a function (type: ${typeof fn}). Check ${pathHint}`);
		throw new TypeError(`${name} must be a function — check exports in ${pathHint}`);
	}
}

// validate exports early with clear messages
assertIsFunction(login, 'login', '../controllers/authController.js');
assertIsFunction(me, 'me', '../controllers/authController.js');
assertIsFunction(logout, 'logout', '../controllers/authController.js');
assertIsFunction(authMiddleware, 'authMiddleware', '../middlewares/authMiddleware.js');

// routes
router.post('/login', login);
router.get('/me', authMiddleware, me);
router.post('/logout', authMiddleware, logout);

// export
module.exports = router;

