-- Initial schema for BikeRoutes.org production D1 database
-- Created: 2026-06-09
-- Covers all tables referenced in worker/src/routes/*

-- route_logs: analytics for /api/route (route.ts)
CREATE TABLE IF NOT EXISTS route_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- search_logs: analytics for /api/search (search.ts)
CREATE TABLE IF NOT EXISTS search_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    ip_hash TEXT,
    created_at TEXT NOT NULL
);

-- donations: PayPal donation records (donate.ts)
CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    amount REAL,
    tier TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL
);

-- pois: approved Points of Interest (poi.ts, POIStore.ts)
CREATE TABLE IF NOT EXISTS pois (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    description TEXT,
    submitted_by TEXT,
    status TEXT DEFAULT 'approved',
    created_at TEXT NOT NULL
);

-- users: magic-link auth users (auth.ts)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_hash TEXT NOT NULL UNIQUE,
    trust_level INTEGER DEFAULT 0,
    display_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
