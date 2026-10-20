# Inject data/game-data.json into tools/game.tpl.html and write index.html
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tpl=open(os.path.join(ROOT,'tools','game.tpl.html'),encoding='utf-8').read()
data=open(os.path.join(ROOT,'data','game-data.json'),encoding='utf-8').read()
open(os.path.join(ROOT,'index.html'),'w',encoding='utf-8').write(tpl.replace('__DATA__',data.replace('</','<\\/')))
print('wrote index.html')
