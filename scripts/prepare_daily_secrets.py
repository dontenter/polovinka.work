"""Run with the Telegram Summary venv; exports existing session without displaying it."""
import json, os, secrets, sys, tempfile
from pathlib import Path
from telethon.sessions import SQLiteSession, StringSession
from telethon.tl.types import InputPeerChannel, InputPeerChat

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/'Telegram Summary'
private = source/'.private'
config = json.loads((private/'credentials.json').read_text())
session = SQLiteSession(str(private/'telegram'))
try:
    chats=[]
    for chat in json.loads((private/'selected_chats.json').read_text()):
        peer=session.get_input_entity(chat['id'])
        if isinstance(peer,InputPeerChannel):
            chats.append({'title':chat['title'],'type':'channel','id':str(peer.channel_id),'accessHash':str(peer.access_hash)})
        elif isinstance(peer,InputPeerChat):
            chats.append({'title':chat['title'],'type':'chat','id':str(peer.chat_id)})
        else: raise SystemExit('Unsupported chat type')
    settings={
        'LIFE_TELEGRAM_API_ID':str(config['api_id']), 'LIFE_TELEGRAM_API_HASH':config['api_hash'],
        'LIFE_TELEGRAM_SESSION':StringSession.save(session), 'LIFE_TELEGRAM_CHATS':json.dumps(chats,ensure_ascii=False),
        'LIFE_OPENAI_API_KEY':(private/'openai.env').read_text().strip().split('=',1)[1],
    }
finally: session.close()
p=root/'.env.local'
existing=p.read_text()
if not any(l.startswith('CRON_SECRET=') for l in existing.splitlines()): settings['CRON_SECRET']=secrets.token_hex(32)
lines=[l for l in existing.splitlines() if l.split('=',1)[0] not in settings]
lines.extend(k+'='+json.dumps(v,ensure_ascii=False) for k,v in settings.items())
os.umask(0o077)
fd,temp=tempfile.mkstemp(dir=root,prefix='.env.',suffix='.local')
with os.fdopen(fd,'w') as f: f.write('\n'.join(lines)+'\n')
os.replace(temp,p)
print('Daily settings saved locally. Telegram session and API keys were not displayed.')
