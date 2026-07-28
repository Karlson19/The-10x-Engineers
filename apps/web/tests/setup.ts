// jsdom has no IndexedDB, so the outbox gets a real in-memory implementation
// rather than a hand-written stub. The tests then exercise the same Dexie code
// paths the browser runs.
import "fake-indexeddb/auto";
