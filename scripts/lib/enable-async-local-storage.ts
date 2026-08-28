/**
 * Makes Next's async storages real when a route handler is called from a script.
 *
 * `next/dist/server/app-render/async-local-storage.js` picks its implementation
 * ONCE, at module load, and falls back to a `FakeAsyncLocalStorage` whose
 * `run()` throws « AsyncLocalStorage accessed in runtime where it is not
 * available » unless `globalThis.AsyncLocalStorage` already exists. Next's own
 * runtimes install it; a plain tsx process does not.
 *
 * Import this module BEFORE anything that pulls in `next/cache` — that is, as
 * the very first import of the test file. Importing it later has no effect,
 * because the storage instance has already been created by then.
 *
 * This only affects test scripts: nothing in the application imports it, and no
 * route is modified to accommodate being called outside a request.
 */
import { AsyncLocalStorage } from 'async_hooks'

const g = globalThis as typeof globalThis & { AsyncLocalStorage?: unknown }
if (!g.AsyncLocalStorage) g.AsyncLocalStorage = AsyncLocalStorage

export const asyncLocalStorageEnabled = true
