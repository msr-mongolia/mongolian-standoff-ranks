# MSR Map / Round screenshot intake bot

Discord bot for collecting screenshots from eight designated channels and forwarding them to an admin review channel. It does not OCR images, calculate scores, or publish results to MSR yet.

## Configuration (private environment variables)
- `DISCORD_BOT_TOKEN`: Discord bot token; never commit it
- `MATCH_SCREENSHOT_CHANNEL_IDS`: comma-separated IDs for all 8 screenshot submission channels
- `MATCH_REVIEW_CHANNEL_ID`: admin-only review channel

Enable **Message Content Intent** in the Discord Developer Portal. Invite the bot with View Channel, Read Message History, Send Messages, Embed Links, Add Reactions permissions in both relevant channels. Only members with Manage Server permission can approve or reject with reactions.

## Run
```bash
npm install
npm start
```
For 24/7 uptime deploy this folder as an always-on background worker (e.g. Render paid worker), with root directory `match-screenshot-bot`, build command `npm install`, start command `npm start`, and environment variables configured privately. Free web hosting or GitHub Pages cannot keep a Discord Gateway bot connected continuously.

## Submission format
Post a screenshot and optional text like `Team A vs Team B | Map: Sandstone | Score: 10-8 | Match ID: MSL-001`. Images are forwarded to review, and admin reacts ✅ or ❌. Approval is only a review label; it does not change site stats.

Example: `MATCH_SCREENSHOT_CHANNEL_IDS=111111111111111111,222222222222222222,...` (replace with the real 8 channel IDs). The bot must be invited to every Discord server containing a configured channel and have permission to view it.
