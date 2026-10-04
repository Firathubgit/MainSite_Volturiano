# 0001: Store everything in local JSON files

Status: accepted

## Context

The agent needs to keep projects, snapshots, sessions, turns, memory and undo snapshots between requests and restarts. The goal for this repo is that someone can clone it and run it with two keys in five minutes.

## Decision

Persistence is a small JSON-file store in `.data/` (`apps/server/lib/store/local-db.js`). Each table is one JSON file. The store exposes a chainable query builder that resolves to `{ data, error }`. There is no login. Every request belongs to one local user.

## Why

- No database to install, no schema to migrate, no extra keys.
- The query builder has the same shape as common Postgres client libraries, so swapping in a real database later means replacing one module, not every call site.
- One local user removes auth from the quick start. Routes still read `req.user.id`, so real auth has one place to plug in.

## Trade-offs

- Single process, single user. No transactions, no concurrent writers.
- Whole tables are held in memory and rewritten on change. Fine for one person's projects, wrong for a hosted service.
- Writes are batched for about 120 ms. A hard kill in that window can lose the last write. The server flushes on SIGINT and SIGTERM.
