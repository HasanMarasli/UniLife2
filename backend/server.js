// Load environment variables early and fail-fast if .env can't be read.
// WHAT: ensure process.env populated
// WHY: missing env values will later cause runtime failures (DB cred, session secret)
// HOW: require('dotenv').config() returns an object but we only use env vars below
require('dotenv').config();

const express = require('express'); // WHAT: web framework
const cors = require('cors'); // WHAT: cross-origin middleware (used by frontend)
const session = require('express-session'); // WHAT: session middleware
const SequelizeStoreFactory = require('connect-session-sequelize'); // WHAT: factory to create a store
const path = require('path'); // WHAT: for any file path handling

// Defensive wrapper: load DB module inside try/catch to catch syntax or connection config errors.
// WHAT: importing may throw if the file has syntax error or throws during execution.
// WHY: a broken config/db.js should be diagnosed immediately and not crash later in obscure ways.
// HOW: try require and keep reference if successful.
let sequelize;
try {
  // Attempt to require the DB configuration. If this module throws, we catch below.
  sequelize = require('./config/db');
  // If sequelize is falsy, that's unexpected: defensive check.
  if (!sequelize) {
    // Throw a clear error to be caught by the outer try/catch
    throw new Error('Sequelize instance is undefined after requiring ./config/db. Check config/db.js export.');
  }
} catch (requireErr) {
  // Log the full error for debugging (DO NOT leak to clients).
  console.error('Failed to load Sequelize instance from ./config/db:', requireErr && requireErr.stack ? requireErr.stack : requireErr);
  // Re-throw to abort initialization since DB is critical for this backend.
  throw requireErr;
}

// Create Express app instance
const app = express();

// Basic middleware: parse JSON bodies. Wrap in try/catch only if the usage could throw (rare).
app.use(express.json()); // WHAT: automatically parse JSON request bodies into req.body
app.use(cors()); // WHAT: allow cross-origin requests; WHY: frontend dev server runs on different port

// Validate critical environment variables early to fail fast.
// WHAT: ensure required secrets are present
// WHY: missing SESSION_SECRET or DB-related envs lead to insecure or failing sessions/DB connections
// HOW: check process.env and throw if missing; caller / process manager will see logs
if (!process.env.SESSION_SECRET || typeof process.env.SESSION_SECRET !== 'string' || process.env.SESSION_SECRET.trim() === '') {
  // We log and exit because sessions cannot be securely created without a secret.
  console.error('FATAL: SESSION_SECRET is missing or invalid in environment. Please set SESSION_SECRET.');
  // Use process.exit to avoid starting the server in an insecure state.
  process.exit(1);
}

// Build session store using connect-session-sequelize inside try/catch
let sessionStore;
try {
  // WHAT: create the session store class by passing session.Store to factory
  const SequelizeStore = SequelizeStoreFactory(session.Store);
  // WHAT: instantiate the store with the sequelize instance
  sessionStore = new SequelizeStore({ db: sequelize });
  if (!sessionStore) {
    throw new Error('Failed to create Sequelize session store instance.');
  }
} catch (err) {
  // Detailed logging for maintainers. Do not reveal internals to clients.
  console.error('Error creating Sequelize session store:', err && err.stack ? err.stack : err);
  // Cannot proceed without session store; exit process.
  process.exit(1);
}

// Add session middleware in guarded block to ensure we don't crash silently
try {
  app.use(session({
    secret: process.env.SESSION_SECRET, // WHAT: secret for signing session ID cookies
    store: sessionStore,                // WHAT: persistent store so sessions survive restarts
    resave: false,                      // WHAT: don't resave unmodified sessions
    saveUninitialized: false,           // WHAT: don't create session until something stored
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 day (DEFENSIVE: explicit expiry)
    }
  }));
} catch (sessionErr) {
  console.error('Failed to configure session middleware:', sessionErr && sessionErr.stack ? sessionErr.stack : sessionErr);
  process.exit(1); // sessions are critical; don't continue in an inconsistent state
}

// Define a helper to mount routes safely: require inside try/catch to catch module errors.
// WHAT: guard route module loading and mounting to provide clearer errors at startup time
// WHY: a failing route file should not silently break app startup or leave partial state
// HOW: try requiring and mounting; if it fails, log and continue/exit as appropriate
try {
  // Attempt to require auth routes; if it throws, we handle it below.
  const authRoutes = require('./routes/authRoutes');
  // Mount auth routes; any runtime errors inside route definitions will be caught by app-level error middleware later.
  app.use('/api/auth', authRoutes);
} catch (routeErr) {
  // Log details for the maintainer. This likely indicates syntax error or missing file.
  console.error('Failed to load or mount /api/auth routes:', routeErr && routeErr.stack ? routeErr.stack : routeErr);
  // We continue startup if you prefer partial functionality; here we choose to exit because auth is core.
  process.exit(1);
}

// Centralized health-check route for monitoring (safe and simple)
app.get('/', (req, res) => {
  // WHAT: simple healthcheck endpoint so load balancers or devs can verify the server is up
  // WHY: returning JSON instead of HTML is easier for automated systems
  res.json({ message: 'Backend çalışıyor!' });
});

// 404 handler: catch unmatched routes
app.use((req, res, next) => {
  // WHAT: if no route matched, respond 404 with a safe message
  // WHY: prevents falling through to a generic 200 or unintentional behavior
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  // WHAT: this middleware catches errors passed with next(err) or thrown in async handlers (if async wrapper used)
  // WHY: unify error responses and avoid leaking stack traces to the client
  // HOW: differentiate client vs server errors and log full details to the console
  try {
    // Defensive: ensure err is an object
    if (!err || typeof err !== 'object') {
      // If error is not an object, create a normalized one
      err = new Error(String(err || 'Bilinmeyen hata'));
    }

    // Extract a safe message and status code; default to 500 for server errors
    const status = err.status && Number.isInteger(err.status) ? err.status : (err.name === 'ValidationError' ? 400 : 500);

    // Log full stack trace server-side for debugging (do NOT send to clients)
    console.error('Unhandled application error:', {
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method
    });

    // Prepare safe response payload for client
    const safePayload = {
      // Provide a user-friendly error message that does not leak internals
      message: status >= 500 ? 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.' : (err.message || 'İstek hatalı')
    };

    // If it's a client error and the error includes extra info, attach it (non-sensitive)
    if (status >= 400 && status < 500 && err.details) {
      safePayload.details = err.details;
    }

    // Send response with appropriate status code
    res.status(status).json(safePayload);
  } catch (handlerErr) {
    // WHAT: if error handler itself fails, log and send minimal response
    console.error('Error while handling an error:', handlerErr && handlerErr.stack ? handlerErr.stack : handlerErr);
    // Minimal safe response
    res.status(500).json({ message: 'Beklenmedik bir hata oluştu.' });
  }
});

// Graceful startup: sync session store and Sequelize models, then listen.
// Wrap entire init in an async IIFE with try/catch to handle async errors clearly.
(async () => {
  const PORT = process.env.PORT ? Number(process.env.PORT) : 5000; // parse port defensively

  try {
    // Sync session store table(s). This may fail if DB connection is down.
    // WHAT: create session table if it doesn't exist
    // WHY: errors can occur on DB connection loss or permission issues
    // HOW: catch and log, then stop startup if critical
    await sessionStore.sync().catch(syncErr => {
      // Throw a new error with context
      throw new Error(`Session store sync failed: ${syncErr && syncErr.message ? syncErr.message : syncErr}`);
    });

    // Sync Sequelize models (create tables). Potential errors: DB inaccessible, permission denied, invalid model definitions.
    // We call sequelize.sync() and catch DB-related errors explicitly to provide clearer logs.
    await sequelize.sync()
      .then(() => {
        console.log('Database synced successfully');
      })
      .catch(dbSyncErr => {
        // Provide a clear logged message and rethrow to be caught by outer try/catch.
        console.error('Database sync failed:', dbSyncErr && dbSyncErr.stack ? dbSyncErr.stack : dbSyncErr);
        // Common cause: invalid credentials, DB down, or migration issues.
        throw dbSyncErr;
      });

    // Start Express server only after DB and session store are ready.
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (startupErr) {
    // WHAT: catch any startup errors (DB, session sync, listen)
    // WHY: ensures we don't leave process in partial state without noticing
    // HOW: log detailed stack and exit with non-zero code so external process manager can restart/alert
    console.error('Failed to start server due to startup error:', startupErr && startupErr.stack ? startupErr.stack : startupErr);
    // Delay exit slightly to allow logs to flush in some environments
    setTimeout(() => process.exit(1), 100);
  }
})();

// Global handlers for uncaught exceptions and unhandled promise rejections
// WHY: ensures we log unexpected errors and fail-fast rather than leaving process in a corrupted state
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception detected:', err && err.stack ? err.stack : err);
  // In production, it's usually safest to restart the process. Exit with failure code.
  setTimeout(() => process.exit(1), 100);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason && reason.stack ? reason.stack : reason);
  // Also exit to ensure process manager can restart the app into a clean state.
  setTimeout(() => process.exit(1), 100);
});
