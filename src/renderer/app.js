// app.js — Entry point for renderer modules
// L-01: This file serves as the documented entry point for the renderer process.
// All functionality is loaded via script tags in index.html:
//   1. app-core.js    — Global state, error boundary, rounding, toast/confirm UI
//   2. app-auth.js    — Authentication (login, register, password reset)
//   3. app-features.js — All business features (invoicing, clients, reports, etc.)
//
// Module loading order is important:
//   app-core.js must load first (defines globals used by other modules)
//   app-auth.js loads second (handles login flow)
//   app-features.js loads last (depends on globals from core and auth)
//
// Version: See package.json for current version.
// App name: Factarlou — Tunisian invoicing software
