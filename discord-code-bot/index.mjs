import {Client,GatewayIntentBits,Partials} from 'discord.js';
import {randomBytes,createHash} from 'node:crypto';
const env=['DISCORD_BOT_TOKEN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
for(const k of env)if(!process.env[k])throw Error('Missing '+k);
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.DirectMessages,GatewayIntentBits.MessageContent],partials:[Partials.Channel]});
const base=process.env.SUPABASE_URL.replace(/\/$/,'');
const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function code(){const bytes=randomBytes(12);return 'MSR-'+[...bytes].map(b=>alphabet[b%alphabet.length]).join('');}
function hash(v){return createHash('sha256').update(v).digest('hex');}
async function findExisting(discordId){
 const r=await fetch(base+'/rest/v1/msr_access_codes?discord_user_id=eq.'+encodeURIComponent(discordId)+'&select=id,status&limit=1',{headers});
 if(!r.ok)throw Error('DB lookup failed '+r.status);return (await r.json())[0];
}
async function createPending(discordId){
 for(let i=0;i<5;i++){
  const value=code();
  const r=await fetch(base+'/rest/v1/msr_access_codes',{method:'POST',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({discord_user_id:discordId,code_hash:hash(value),status:'pending'})});
  if(r.ok)return value;
  if(r.status===409){const existing=await findExisting(discordId);if(existing)return null;continue;}
  throw Error('DB insert failed '+r.status);
 }
 throw Error('Could not issue unique code');
}
client.on('messageCreate',async m=>{
 if(m.author.bot||m.guildId)return;
 if(!/^(\/code|code|код|id code)$/i.test(m.content.trim()))return;
 try{
  const existing=await findExisting(m.author.id);
  if(existing){await m.reply('Таны кодын хүсэлт бүртгэлтэй байна. Аюулгүй байдлын үүднээс хуучин кодыг дахин илгээхгүй. Админтай холбогдоно уу.');return;}
  const issued=await createPending(m.author.id);
  if(!issued){await m.reply('Таны хүсэлт бүртгэлтэй байна. Админтай холбогдоно уу.');return;}
  await m.reply('Таны MSR код: **'+issued+'**\nЭнэ код одоогоор идэвхгүй. Админ таны Standoff 2 ID болон багийн бүртгэлийг баталгаажуулсны дараа ашиглах боломжтой болно. Кодоо бусдад бүү дамжуулаарай.');
 }catch(e){console.error('Code request failed:',e.message);await m.reply('Код олгох үйлчилгээ түр боломжгүй байна. Дараа дахин оролдоно уу.').catch(()=>{});}
});
client.once('ready',()=>console.log('MSR code DM bot connected'));
await client.login(process.env.DISCORD_BOT_TOKEN);
