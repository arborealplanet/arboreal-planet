// Shared, server-safe home for the Arboreal Planet TV submissions address.
// NOTE: keep this module free of "use client" — server components (e.g.
// src/app/episodes/page.tsx) import this constant directly, and importing it
// from a client component would throw "Attempted to call ... from the server"
// at render time.
export const EPISODE_SUBMISSIONS_EMAIL = "arborealplanet@gmail.com";
