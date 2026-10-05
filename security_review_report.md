## Security Review Results

### BLOCK (must fix before publishing)
- None.

### WARN (inform user, let them decide)
- **Backend**: Supabase (project qtetsgwwsvqzquxssudj) with Edge Functions (`discord-commands`, `steam-login`, `discord-notify`) and RLS-protected tables. The `discord-commands` endpoint validates Discord Ed25519 signatures; the service_role key is never in the repo.
- **Ranks**: The site uses VALORANT ranks (Iron–Radiant) stored in `season_player_stats.rank`, not the fictional VANTS rank system. The `leaderboard` SQL view is read-only.
- **Merge conflicts**: All previously broken files (`app.js`, `auth.js`, `index.html`, `supabase/functions/discord-commands/index.ts`) have been repaired and no longer contain `feat/diseno-premium` markers.

### PASS
- Dependency audit: no `package.json` or `requirements.txt`; no dependency audit target is present.
- Hardcoded secret scan: no matching API keys, private keys, passwords, or other secret patterns found in the project source; no `.env*` files found. The Supabase anon key (`sb_publishable`) is public by design and protected by RLS.
- Common vulnerability patterns: no exploitable `eval()`, `new Function()`, `document.write()`, server-side command execution, or injection flow found. `innerHTML` usage is limited to app-generated markup and escaped dynamic values.
- Open CORS and missing auth: no CORS configuration issues; Supabase RLS controls access to all tables.
- Project is static frontend + Supabase backend: `index.html`, CSS, JavaScript (app.js, auth.js, zona.js, admin.js, ranks.js) with real data from Supabase; no local fictional data.
