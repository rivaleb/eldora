import './style.css';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = canvas.width, H = canvas.height, TILE = 32;
const world = { cols: 54, rows: 42, tiles: [], objects: [], enemies: [], day: 1, time: 8 * 60, elapsed: 0 };
const player = { x: 480, y: 300, r: 10, speed: 145, health: 100, hunger: 100, stamina: 100, facing: 'down', attack: 0, invuln: 0 };
const inventory = { wood: 0, stone: 0, berry: 3, fiber: 0, slime: 0, axe: 0, sword: 0, campfire: 0 };
const itemMeta = {
  wood:{name:'Wood',icon:'🪵',desc:'Timber gathered from trees.'},
  stone:{name:'Stone',icon:'🪨',desc:'A sturdy material for crafting.'},
  berry:{name:'Wild berries',icon:'🍓',desc:'Restores hunger when eaten.'},
  fiber:{name:'Plant fiber',icon:'🌿',desc:'Useful for simple equipment.'},
  slime:{name:'Slime gel',icon:'🟢',desc:'A strange drop from forest slimes.'},
  axe:{name:'Stone axe',icon:'🪓',desc:'A tool for gathering wood.'},
  sword:{name:'Ironwood blade',icon:'⚔️',desc:'Deals more damage to monsters.'},
  campfire:{name:'Campfire kit',icon:'🔥',desc:'Crafted shelter marker and night comfort.'}
};
const recipes = [
  {id:'axe',name:'Stone Axe',icon:'🪓',cost:{wood:3,stone:2},desc:'Improves gathering.'},
  {id:'sword',name:'Ironwood Blade',icon:'⚔️',cost:{wood:4,stone:3,slime:1},desc:'A stronger weapon.'},
  {id:'campfire',name:'Campfire Kit',icon:'🔥',cost:{wood:5,stone:3,fiber:2},desc:'A small safe haven.'}
];
const keys = new Set();
const touch = {up:false,down:false,left:false,right:false};
let selected = null, last = performance.now(), toastTimer, gameEnded = false;
const $ = s => document.querySelector(s);
const rand = (a,b) => Math.random()*(b-a)+a;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const night = () => world.time >= 19*60 || world.time < 5*60;
const count = id => inventory[id] || 0;

function notify(message){
  const el=$('#toast'); el.textContent=message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),1800);
}
function makeWorld(){
  world.tiles=[];
  for(let y=0;y<world.rows;y++){const row=[];for(let x=0;x<world.cols;x++)row.push(Math.random()<.12?'flower':'grass');world.tiles.push(row);}
  world.objects=[];world.enemies=[];
  const add=(type,x,y)=>world.objects.push({type,x,y,hp:1,alive:true});
  for(let i=0;i<95;i++){const x=rand(2,world.cols-2)*TILE,y=rand(2,world.rows-2)*TILE;if(Math.hypot(x-player.x,y-player.y)>90)add('tree',x,y);}
  for(let i=0;i<75;i++){const x=rand(1,world.cols-1)*TILE,y=rand(1,world.rows-1)*TILE;if(Math.hypot(x-player.x,y-player.y)>55)add(Math.random()<.55?'rock':'berrybush',x,y);}
  for(let i=0;i<5;i++)spawnSlime(true);
}
function spawnSlime(initial=false){
  let x,y,tries=0;do{x=rand(60,world.cols*TILE-60);y=rand(60,world.rows*TILE-60);tries++;}while(Math.hypot(x-player.x,y-player.y)<180&&tries<20);
  world.enemies.push({x,y,hp:initial?30:35,speed:initial?36:44,attackCd:0,hit:0});
}
function canAfford(cost){return Object.entries(cost).every(([k,v])=>count(k)>=v);}
function spend(cost){for(const [k,v] of Object.entries(cost))inventory[k]-=v;}
function craft(id){
  const recipe=recipes.find(r=>r.id===id);if(!recipe||!canAfford(recipe.cost))return;
  spend(recipe.cost);inventory[id]++;renderUI();notify(`${recipe.name} crafted!`);
}
function nearestObject(){
  return world.objects.filter(o=>o.alive).map(o=>({...o,d:Math.hypot(o.x-player.x,o.y-player.y)})).filter(o=>o.d<48).sort((a,b)=>a.d-b.d)[0];
}
function gather(){
  const obj=nearestObject();if(!obj){notify('No resource nearby.');return;}
  const real=world.objects.find(o=>o===obj || (o.type===obj.type&&o.x===obj.x&&o.y===obj.y));
  if(!real)return;
  if(real.type==='tree'){inventory.wood+=inventory.axe?3:2;inventory.fiber+=Math.random()<.3?1:0;notify('Gathered wood.');}
  if(real.type==='rock'){inventory.stone+=2;notify('Gathered stone.');}
  if(real.type==='berrybush'){inventory.berry+=2;notify('Gathered wild berries.');}
  real.alive=false;renderUI();
}
function eat(){
  if(!count('berry')){notify('No berries in inventory.');return;}
  inventory.berry--;player.hunger=clamp(player.hunger+28,0,100);renderUI();notify('You ate wild berries. +28 hunger');
}
function attack(){
  if(player.stamina<8){notify('Not enough stamina.');return;}
  player.stamina-=8;player.attack=.22;
  const target=world.enemies.filter(e=>Math.hypot(e.x-player.x,e.y-player.y)<52).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
  if(target){target.hp-=inventory.sword?28:14;target.hit=.2;if(target.hp<=0){world.enemies=world.enemies.filter(e=>e!==target);inventory.slime++;if(Math.random()<.35)inventory.berry++;notify('Slime defeated! +1 slime gel');renderUI();}}
}
function interact(){gather();}
function update(dt){
  if(gameEnded)return;
  world.elapsed+=dt;world.time+=dt*2.2;
  if(world.time>=1440){world.time-=1440;world.day++;notify(`Day ${world.day} begins.`);}
  player.hunger=clamp(player.hunger-dt*.22,0,100);
  if(player.hunger<=0)player.health-=dt*3.2;
  player.stamina=clamp(player.stamina+dt*(player.attack>0?0:9),0,100);
  player.attack=Math.max(0,player.attack-dt);player.invuln=Math.max(0,player.invuln-dt);
  let dx=(keys.has('d')||keys.has('arrowright')||touch.right?1:0)-(keys.has('a')||keys.has('arrowleft')||touch.left?1:0);
  let dy=(keys.has('s')||keys.has('arrowdown')||touch.down?1:0)-(keys.has('w')||keys.has('arrowup')||touch.up?1:0);
  if(dx||dy){const len=Math.hypot(dx,dy);dx/=len;dy/=len;player.x=clamp(player.x+dx*player.speed*dt,18,world.cols*TILE-18);player.y=clamp(player.y+dy*player.speed*dt,18,world.rows*TILE-18);if(Math.abs(dx)>Math.abs(dy))player.facing=dx>0?'right':'left';else player.facing=dy>0?'down':'up';}
  const safe=world.objects.some(o=>o.type==='campfire'&&o.alive&&Math.hypot(o.x-player.x,o.y-player.y)<100);
  for(const e of world.enemies){
    e.hit=Math.max(0,e.hit-dt);e.attackCd=Math.max(0,e.attackCd-dt);
    const dist=Math.hypot(player.x-e.x,player.y-e.y);
    if(dist<260){const speed=e.speed*(night()?1.55:1);if(dist>19){e.x+=(player.x-e.x)/dist*speed*dt;e.y+=(player.y-e.y)/dist*speed*dt;}else if(e.attackCd<=0&&player.invuln<=0){player.health-=safe?3:8;player.invuln=.7;e.attackCd=1.1;notify('A slime hit you!');}}
  }
  if(night()&&world.elapsed%8<dt&&world.enemies.length<12)spawnSlime();
  if(player.health<=0){player.health=0;gameEnded=true;$('#days-survived').textContent=world.day;$('#game-over').classList.remove('hidden');}
  renderUI();
}
function camera(){return{x:clamp(player.x-W/2,0,world.cols*TILE-W),y:clamp(player.y-H/2,0,world.rows*TILE-H)};}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function drawWorld(){
  const cam=camera();ctx.clearRect(0,0,W,H);
  const startX=Math.floor(cam.x/TILE),startY=Math.floor(cam.y/TILE);
  for(let y=startY;y<Math.min(startY+Math.ceil(H/TILE)+2,world.rows);y++)for(let x=startX;x<Math.min(startX+Math.ceil(W/TILE)+2,world.cols);x++){
    const px=x*TILE-cam.x,py=y*TILE-cam.y;
    rect(px,py,TILE,TILE,((x*7+y*13)%5===0)?'#47734b':'#527e50');
    if((x*11+y*3)%7===0)rect(px+7,py+9,3,2,'#71945a');
    if((x*5+y*17)%11===0)rect(px+22,py+22,2,3,'#385f42');
    if(world.tiles[y]?.[x]==='flower') {rect(px+13,py+14,3,3,'#e6c47c');rect(px+14,py+13,1,1,'#f6e6a7');}
  }
  for(const o of world.objects){if(!o.alive)continue;const x=o.x-cam.x,y=o.y-cam.y;if(x<-40||y<-40||x>W+40||y>H+40)continue;
    if(o.type==='tree'){rect(x-4,y+2,9,19,'#674a35');rect(x-15,y-18,30,25,'#28553c');rect(x-11,y-25,22,15,'#36704a');rect(x-7,y-27,8,5,'#4b8650');}
    if(o.type==='rock'){rect(x-12,y-8,24,17,'#777f79');rect(x-7,y-13,14,7,'#a0a79a');rect(x-5,y-2,5,3,'#c0c1ad');}
    if(o.type==='berrybush'){rect(x-10,y-4,20,13,'#38633f');rect(x-6,y-10,12,8,'#4b7e4b');rect(x-5,y-6,3,3,'#d66e66');rect(x+3,y-2,3,3,'#d66e66');}
    if(o.type==='campfire'){rect(x-12,y+5,24,5,'#70503a');rect(x-8,y-5,16,12,'#e07b3d');rect(x-4,y-11,8,14,'#ffd16d');}
  }
  for(const e of world.enemies){const x=e.x-cam.x,y=e.y-cam.y;rect(x-10,y-5,20,14,e.hit?'#d9e5b0':'#76b85f');rect(x-7,y-10,14,8,'#8bd06d');rect(x-5,y-1,3,3,'#172321');rect(x+3,y-1,3,3,'#172321');rect(x-8,y+8,5,3,'#3e754a');rect(x+4,y+8,5,3,'#3e754a');rect(x-10,y-17,20,3,'#172321');rect(x-10,y-17,20*clamp(e.hp/35,0,1),3,'#d66c68');}
  const px=player.x-cam.x,py=player.y-cam.y;
  // Shadow and compact adventurer sprite
  rect(px-8,py+9,17,4,'#29432f');
  rect(px-7,py-9,14,17,'#4d7890');rect(px-6,py-15,12,9,'#d8b28a');rect(px-7,py-17,14,5,'#594332');
  rect(px-5,py-2,10,6,'#d0a46d');rect(px-6,py+8,5,5,'#3d3440');rect(px+2,py+8,5,5,'#3d3440');
  rect(px-4,py-11,2,2,'#182426');rect(px+3,py-11,2,2,'#182426');
  if(player.attack>0){const ox=player.facing==='right'?18:player.facing==='left'?-23:0,oy=player.facing==='down'?18:player.facing==='up'?-22:0;rect(px+ox-3,py+oy-3,7,7,'#e7d28b');}
  // daylight/night tint
  const hour=world.time/60;let alpha=0;
  if(hour>=18)alpha=clamp((hour-18)/2.5,0,.52);else if(hour<6)alpha=.48;else if(hour<7)alpha=clamp((7-hour),0,.48);
  if(alpha>0){ctx.fillStyle=`rgba(13,22,48,${alpha})`;ctx.fillRect(0,0,W,H);}
  // HUD overlay
  ctx.fillStyle='#0d1718bb';ctx.fillRect(14,14,160,34);ctx.fillStyle='#f1e4c2';ctx.font='12px monospace';ctx.fillText(`${night()?'☾ NIGHT':'☀ DAY'}  ${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor(world.time%60/5)*5).padStart(2,'0')}`,24,36);
  ctx.fillStyle='#e4eadb';ctx.font='10px monospace';ctx.fillText(`DAY ${world.day}`,W-76,31);
  ctx.fillStyle='#ffffff99';ctx.font='9px monospace';ctx.fillText('WASD MOVE  ·  SPACE ATTACK  ·  E GATHER',14,H-15);
}
function renderUI(){
  for(const [id,val] of [['health',player.health],['hunger',player.hunger],['stamina',player.stamina]]){$(`#${id}-value`).textContent=`${Math.ceil(val)} / 100`;$(`#${id}-bar`).style.width=`${val}%`;}
  $('#world-clock').textContent=`DAY ${world.day} · ${String(Math.floor(world.time/60)).padStart(2,'0')}:${String(Math.floor(world.time%60)).padStart(2,'0')}`;
  const inv=$('#inventory');inv.innerHTML='';
  const ids=Object.keys(itemMeta);ids.forEach(id=>{const slot=document.createElement('button');slot.className='slot'+(count(id)?'':' empty')+(selected===id?' selected':'');slot.innerHTML=`${itemMeta[id].icon}<span class="qty">${count(id)||''}</span>`;slot.title=itemMeta[id].name;slot.onclick=()=>{selected=id;$('#item-detail').textContent=`${itemMeta[id].name}: ${itemMeta[id].desc} Quantity: ${count(id)}.`;renderUI();};inv.append(slot);});
  $('#inventory-count').textContent=`${ids.filter(id=>count(id)>0).length} / ${ids.length}`;
  const recipesEl=$('#recipes');recipesEl.innerHTML='';
  recipes.forEach(r=>{const el=document.createElement('div');el.className='recipe';const cost=Object.entries(r.cost).map(([k,v])=>`${itemMeta[k].icon} ${v}`).join('  ');el.innerHTML=`<div class="recipe-info"><b>${r.icon} ${r.name}</b><span>${cost}</span></div><button class="craft-btn" ${canAfford(r.cost)?'':'disabled'}>Craft</button>`;el.querySelector('button').onclick=()=>craft(r.id);recipesEl.append(el);});
  const progress=clamp(Math.min(count('wood')/5,count('stone')/3)*100,0,100);$('#objective-progress').style.width=progress+'%';
  $('#objective').textContent=progress>=100?'You are prepared. Craft a weapon or campfire before the next night.':`Gather ${Math.max(0,5-count('wood'))} more wood and ${Math.max(0,3-count('stone'))} more stone to prepare for nightfall.`;
}
function save(){
  const data={player:{...player},inventory:{...inventory},world:{day:world.day,time:world.time,objects:world.objects,enemies:world.enemies}};
  localStorage.setItem('eldoria-save',JSON.stringify(data));notify('Progress saved on this device.');
}
function load(){
  try{const d=JSON.parse(localStorage.getItem('eldoria-save'));if(!d)return false;Object.assign(player,d.player);Object.assign(inventory,d.inventory);world.day=d.world.day;world.time=d.world.time;world.objects=d.world.objects;world.enemies=d.world.enemies;return true;}catch{return false;}
}
function restart(){Object.assign(player,{x:480,y:300,health:100,hunger:100,stamina:100,attack:0,invuln:0});Object.keys(inventory).forEach(k=>inventory[k]=0);inventory.berry=3;world.day=1;world.time=480;world.elapsed=0;gameEnded=false;$('#game-over').classList.add('hidden');makeWorld();renderUI();notify('A new journey begins.');}
function loop(now){const dt=Math.min((now-last)/1000,.05);last=now;update(dt);drawWorld();requestAnimationFrame(loop);}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();keys.add(k);if(e.repeat)return;if(k===' ')attack();if(k==='e')interact();if(k==='f')eat();if(k==='c')$('#recipes').scrollIntoView({behavior:'smooth',block:'nearest'});});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.querySelectorAll('[data-move]').forEach(btn=>{const dir=btn.dataset.move;const on=()=>touch[dir]=true,off=()=>touch[dir]=false;btn.addEventListener('pointerdown',e=>{e.preventDefault();on();});['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,off));});
document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>({attack,gather:interact,eat})[btn.dataset.action]()));
$('#save-btn').onclick=save;$('#help-btn').onclick=()=>$('#help-overlay').classList.remove('hidden');$('#close-help').onclick=()=>$('#help-overlay').classList.add('hidden');$('#restart-btn').onclick=restart;
makeWorld();const loaded=load();renderUI();if(loaded)notify('Saved journey restored.');else notify('Welcome to Eldoria. Gather resources to survive.');
requestAnimationFrame(loop);
setInterval(()=>{if(!gameEnded)localStorage.setItem('eldoria-save',JSON.stringify({player:{...player},inventory:{...inventory},world:{day:world.day,time:world.time,objects:world.objects,enemies:world.enemies}}));},15000);
