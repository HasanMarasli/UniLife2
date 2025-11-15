let express;
try {
	// require express and fail fast with a readable message if it's missing
	express = require('express');
} catch (err) {
	console.error("Missing dependency: 'express'.\nRun:\n  npm install\nor\n  npm install express --save\nThen restart with: npm run dev");
	process.exit(1);
}

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());

// mount routes
const authRoutes = require('./backend/routes/authRoutes');
app.use('/api/auth', authRoutes);

// health check
app.get('/', (req, res) => res.send('Server is running'));

// start
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});