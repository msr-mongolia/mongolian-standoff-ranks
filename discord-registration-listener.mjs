// MSR instant registration sync bridge. Run on an always-on Node.js host.
// Required secrets: DISCORD_BOT_TOKEN, MSR_SYNC_TOKEN.
import { Client, GatewayIntentBits, Partials } from 'discord.js';
const channelId = '1563893301269237812';
const endpoint = 'https://gqepygqtgosvpfirahgd.supabase.co/functions/v1/msr-discord-sync';
if (!process.env.DISCORD_BOT_TOKEN || !process.env.MSR_SYNC_TOKEN) throw new Error('Missing bot/sync token environment variables');
const client = new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent],partials:[Partials.Message,Partials.Channel]});
let running = false, queued = false;
async function sync(){
  if(running){queued=true;return;}
  running=true;
  do {
    queued=false;
    try {
      const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+process.env.MSR_SYNC_TOKEN}});
      const result=await response.json();
      if(!response.ok||!result.ok) console.error('MSR sync failed:',result.error||response.status);
      else console.log('MSR sync complete:',result);
    }catch(error){console.error('MSR sync network error:',error.message);}
  } while(queued);
  running=false;
}
client.on('ready',()=>{console.log('MSR registration listener ready:',client.user.tag);void sync();});
client.on('messageCreate',m=>{if(m.channelId===channelId)void sync();});
client.on('messageUpdate',(_old,m)=>{if(m.channelId===channelId)void sync();});
client.on('messageDelete',m=>{if(m.channelId===channelId)void sync();});
client.on('error',error=>console.error('Discord client error:',error));
await client.login(process.env.DISCORD_BOT_TOKEN);
