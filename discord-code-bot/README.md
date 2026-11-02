# MSR Discord DM code request bot (not deployed)

DM the bot `code`, `/code`, `код` or `id code`. It creates a random one-time issued identifier and stores only its SHA-256 hash in Supabase. Each Discord user can request only one pending code. The code stays **pending** until an admin verifies the user's Standoff 2 identity and links an existing Auth user. No password or email is collected in Discord.

## Important
This is a **code issuance prototype**, not an operational login method. The existing MSR email/password login remains unchanged. Implement a secure backend code-to-account resolution flow before changing the login UI; never attempt to authenticate by searching public tables or embedding service-role credentials in browser code. Recovery/reissue needs a controlled admin workflow.

Create the table from `schema.sql` after schema/security review. Run this as an always-on worker with secret environment variables `DISCORD_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Never commit these values. Enable Discord Message Content intent and allow bot DMs.
