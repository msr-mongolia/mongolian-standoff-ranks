import {Client, GatewayIntentBits, Partials, EmbedBuilder} from 'discord.js';

const required=['DISCORD_BOT_TOKEN','MATCH_SCREENSHOT_CHANNEL_ID','MATCH_REVIEW_CHANNEL_ID'];
for(const key of required) if(!process.env[key]) throw new Error('Missing '+key);
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent],partials:[Partials.Channel,Partials.Message]});
const allowed=new Set(['image/png','image/jpeg','image/webp']);
const reviewChannel=process.env.MATCH_REVIEW_CHANNEL_ID;
const sourceChannel=process.env.MATCH_SCREENSHOT_CHANNEL_ID;
const maxSize=8*1024*1024;
client.on('ready',()=>console.log('MSR screenshot intake online as '+client.user.tag));
client.on('messageCreate',async message=>{
 if(message.author.bot||message.channelId!==sourceChannel)return;
 const attachments=[...message.attachments.values()].filter(a=>allowed.has(a.contentType?.split(';')[0])&&a.size<=maxSize);
 if(!attachments.length)return;
 const channel=await client.channels.fetch(reviewChannel).catch(()=>null);
 if(!channel?.isTextBased()) {console.error('Review channel unavailable');return;}
 const text=message.content.slice(0,900).trim()||'No match details supplied';
 for(const attachment of attachments.slice(0,5)){
  const embed=new EmbedBuilder().setTitle('MSR • Map / Round Screenshot — PENDING')
   .setColor(0xe0a94b).setDescription('**Submitted by:** <@'+message.author.id+'>\n**Match details:** '+text+'\n**Source:** [Original message]('+message.url+')\n**Status:** Pending admin review')
   .setImage(attachment.url).setTimestamp();
  try{const posted=await channel.send({embeds:[embed]});await posted.react('✅');await posted.react('❌');}
  catch(e){console.error('Cannot forward screenshot:',e.message);}
 }
 await message.react('📥').catch(()=>{});
});
client.on('messageReactionAdd',async(reaction,user)=>{
 if(user.bot)return;
 if(reaction.partial)await reaction.fetch().catch(()=>{});
 if(reaction.message.channelId!==reviewChannel||!['✅','❌'].includes(reaction.emoji.name))return;
 const member=await reaction.message.guild?.members.fetch(user.id).catch(()=>null);
 if(!member?.permissions.has('ManageGuild'))return;
 const msg=await reaction.message.fetch().catch(()=>null);
 const embed=msg?.embeds[0];if(!embed?.title?.includes('PENDING'))return;
 const approved=reaction.emoji.name==='✅';
 const updated=EmbedBuilder.from(embed).setTitle('MSR • Map / Round Screenshot — '+(approved?'APPROVED':'REJECTED')).setColor(approved?0x24a36a:0xb94545)
 .addFields({name:'Reviewed by',value:'<@'+user.id+'>'});
 await msg.edit({embeds:[updated]}).catch(e=>console.error('Review update failed:',e.message));
});
client.on('error',e=>console.error('Discord error:',e.message));
await client.login(process.env.DISCORD_BOT_TOKEN);
