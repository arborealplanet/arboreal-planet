"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const COLS = 9;
const ROWS = 12;
const START = { x: 4, y: 11 };
const LANE_TYPES = ["goal","branch","hazard","branch","vine","rest","branch","hazard","vine","branch","rest","start"] as const;

type Goal = { type: "top" } | { type: "side"; dir: "left" | "right"; row: number };
type Stage = { name: string; subtitle: string; speed: number; bonus: number; goal: Goal };

// Canopy Crossing's own identity: not every stage climbs. Some crossings
// end at the crown (top row), others at the far bank (walk off the screen edge).
const STAGES: Stage[] = [
  { name: "Rainforest Edge", subtitle: "Learn the canopy · climb to the crown", speed: 1, bonus: 500, goal: { type: "top" } },
  { name: "River Crossing", subtitle: "Fast wet limbs · cross to the far bank", speed: 1.12, bonus: 650, goal: { type: "side", dir: "right", row: 6 } },
  { name: "Dense Canopy", subtitle: "Tighter safe windows · climb to the crown", speed: 1.25, bonus: 800, goal: { type: "top" } },
  { name: "Night Canopy", subtitle: "Predators in the dark · slip out the far side", speed: 1.38, bonus: 1000, goal: { type: "side", dir: "left", row: 3 } },
  { name: "Tropical Storm", subtitle: "Survive the crown · final ascent", speed: 1.55, bonus: 1500, goal: { type: "top" } },
];

const stageOf = (level: number): Stage => STAGES[Math.min(Math.max(level, 1) - 1, STAGES.length - 1)];
const objectiveOf = (s: Stage): string =>
  s.goal.type === "top" ? "↑ REACH THE CROWN" : s.goal.dir === "right" ? "→ CROSS TO THE FAR BANK" : "← CROSS TO THE FAR BANK";

type Pos = { x:number; y:number };
type Mover = { row:number; x:number; width:number; speed:number; kind:"branch"|"hazard"|"vine" };
type Insect = { x:number; y:number };
type Firefly = {x:number;y:number;phase:number};
const FIREFLIES:Firefly[] = Array.from({length:18},(_,i)=>({x:(i*47)%100,y:(i*73)%100,phase:i*.83}));

// Production sprite art: generated in the locked Arboreal Planet style
// (bold cartoon-vector, thick outlines, cel shading, black keyable bg).
const SPRITE_SRC: Record<string,string> = {
  "monitor-up": "/arcade/canopy-crossing/monitor-up.webp",
  "monitor-down": "/arcade/canopy-crossing/monitor-down.webp",
  "monitor-left": "/arcade/canopy-crossing/monitor-left.webp",
  "monitor-right": "/arcade/canopy-crossing/monitor-right.webp",
  branch: "/arcade/canopy-crossing/branch.webp",
  vine: "/arcade/canopy-crossing/vine.webp",
  predator: "/arcade/canopy-crossing/predator.webp",
  insect: "/arcade/canopy-crossing/insect.webp",
  foliage: "/arcade/canopy-crossing/foliage.webp",
};

const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n));

function makeMovers(level:number): Mover[] {
  const movers: Mover[] = [];
  const goal = stageOf(level).goal;
  for (let row=1; row<=9; row++) {
    if (row===5) continue;
    if (goal.type==="side" && row===goal.row) {
      // Exit limb: a safe perch patrolled by predators — time the walk to the edge.
      for (let i=0;i<2;i++) movers.push({row,x:i*4.5,width:1.1,speed:(i%2?1:-1)*(0.85+level*0.07),kind:"hazard"});
      continue;
    }
    const kind = LANE_TYPES[row] === "hazard" ? "hazard" : LANE_TYPES[row] === "vine" ? "vine" : "branch";
    const dir = row % 2 ? 1 : -1;
    const stage=stageOf(level);
    const base = (0.40 + level * 0.025 + row * 0.012) * stage.speed;
    for (let i=0;i<3;i++) movers.push({row,x:i*3.6+(row%3)*0.45,width:kind==="branch"?2.25:kind==="vine"?1.55:1.1,speed:dir*base,kind});
  }
  return movers;
}

function makeInsects(level:number): Insect[] {
  const goal = stageOf(level).goal;
  const rows = [1,2,3,4,6,7,8,9].filter(r=>!(goal.type==="side"&&r===goal.row));
  let seed = level*97+13;
  const rnd = () => (seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
  const spots: Insect[] = [];
  for (let i=0;i<6;i++) spots.push({x:Math.floor(rnd()*COLS),y:rows[Math.floor(rnd()*rows.length)]});
  return spots;
}

export default function CanopyCrossing() {
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const moversRef = useRef<Mover[]>(makeMovers(1));
  const insectsRef = useRef<Insect[]>(makeInsects(1));
  const playerRef = useRef<Pos>({...START});
  const lastRef = useRef(0);
  const runningRef = useRef(false);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const bugsRef = useRef(0);
  const touchRef = useRef<{x:number;y:number}|null>(null);
  const facingRef = useRef<"up"|"down"|"left"|"right">("up");
  const [running,setRunning] = useState(false);
  const [score,setScore] = useState(0);
  const [lives,setLives] = useState(3);
  const [level,setLevel] = useState(1);
  const [bugs,setBugs] = useState(0);
  const [message,setMessage] = useState("Cross five wild canopy stages. Climb to the crown — or slip out the far bank. Ride branches and vines; dodge predators.");
  const [best,setBest] = useState(0);
  const [paused,setPaused] = useState(false);
  const [narrow,setNarrow] = useState(false);
  const bestRef = useRef(0);
  const pausedRef = useRef(false);
  const stageStartRef = useRef(0);
  const lastRowRef = useRef(START.y);
  const messageUntilRef = useRef(0);
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  useEffect(()=>{
    for(const [k,src] of Object.entries(SPRITE_SRC)){
      const img=new Image();
      img.onload=()=>{spritesRef.current[k]=img;};
      img.src=src;
    }
  },[]);
  useEffect(()=>{
    const mq = window.matchMedia("(max-width:640px)");
    const apply = ()=>setNarrow(mq.matches);
    apply();
    mq.addEventListener("change",apply);
    return ()=>mq.removeEventListener("change",apply);
  },[]);

  const resetPlayer = useCallback(() => { playerRef.current={...START}; lastRowRef.current=START.y; facingRef.current="up"; },[]);
  const syncBest = useCallback((value:number) => {
    if(value>bestRef.current){bestRef.current=value;setBest(value);try{localStorage.setItem("canopy-crossing-best",String(value));}catch{}}
  },[]);
  useEffect(()=>{try{const v=Number(localStorage.getItem("canopy-crossing-best")||0);bestRef.current=v;setBest(v);}catch{}},[]);
  const togglePause=useCallback(()=>{if(!runningRef.current)return;pausedRef.current=!pausedRef.current;setPaused(pausedRef.current);setMessage(pausedRef.current?"PAUSED":"");},[]);

  const showStageCard = useCallback((lv:number) => {
    const s = stageOf(lv);
    setMessage(`STAGE ${lv} — ${s.name.toUpperCase()} · ${s.subtitle}`);
    messageUntilRef.current = performance.now()+1800;
  },[]);

  const advanceStage = useCallback(() => {
    const completed = stageOf(levelRef.current);
    const t = performance.now();
    if (levelRef.current>=STAGES.length) {
      const timeBonus=Math.max(0,Math.floor(1500-(t-stageStartRef.current)/20));
      scoreRef.current+=completed.bonus+timeBonus;
      setScore(scoreRef.current);syncBest(scoreRef.current);
      runningRef.current=false;setRunning(false);
      setMessage("CROWN CONQUERED — all five crossings complete!");
      resetPlayer();
      return;
    }
    levelRef.current++; scoreRef.current+=completed.bonus; stageStartRef.current=t;
    setLevel(levelRef.current);setScore(scoreRef.current);
    moversRef.current=makeMovers(levelRef.current);
    insectsRef.current=makeInsects(levelRef.current);
    resetPlayer();
    showStageCard(levelRef.current);
  },[resetPlayer,syncBest,showStageCard]);

  const start = useCallback(() => {
    levelRef.current=1; scoreRef.current=0; livesRef.current=3; bugsRef.current=0;
    moversRef.current=makeMovers(1); insectsRef.current=makeInsects(1); resetPlayer();
    setLevel(1);setScore(0);setLives(3);setBugs(0);
    stageStartRef.current=performance.now();pausedRef.current=false;setPaused(false);
    runningRef.current=true;setRunning(true);
    showStageCard(1);
  },[resetPlayer,showStageCard]);

  const move = useCallback((dx:number,dy:number) => {
    if(!runningRef.current||pausedRef.current) return;
    const p=playerRef.current;
    if(dx>0) facingRef.current="right"; else if(dx<0) facingRef.current="left";
    else if(dy<0) facingRef.current="up"; else if(dy>0) facingRef.current="down";
    const nx=p.x+dx;
    if(dx!==0&&(nx<0||nx>COLS-1)){
      const goal=stageOf(levelRef.current).goal;
      if(goal.type==="side"&&p.y===goal.row&&((dx<0&&goal.dir==="left")||(dx>0&&goal.dir==="right"))){
        advanceStage();
        return;
      }
    }
    p.x=clamp(nx,0,COLS-1);
    p.y=clamp(p.y+dy,0,ROWS-1);
    if(dy<0){
      const progress=Math.max(0,lastRowRef.current-p.y);
      if(progress>0){scoreRef.current+=10*progress;setScore(scoreRef.current);lastRowRef.current=p.y;}
    }
    const ix=insectsRef.current.findIndex(s=>s.x===p.x&&s.y===p.y);
    if(ix>=0){
      insectsRef.current.splice(ix,1);
      scoreRef.current+=25;setScore(scoreRef.current);
      bugsRef.current+=1;setBugs(bugsRef.current);
    }
  },[advanceStage]);

  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase();
      if(["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k)) e.preventDefault();
      if(k==="arrowup"||k==="w") move(0,-1);
      if(k==="arrowdown"||k==="s") move(0,1);
      if(k==="arrowleft"||k==="a") move(-1,0);
      if(k==="arrowright"||k==="d") move(1,0);
      if(k==="p"||k==="escape") togglePause();
    };
    window.addEventListener("keydown",key,{passive:false});
    return()=>window.removeEventListener("keydown",key);
  },[move,togglePause]);

  useEffect(()=>{
    let raf=0;
    const frame=(t:number)=>{
      const c=canvasRef.current; if(!c){raf=requestAnimationFrame(frame);return;}
      const ctx=c.getContext("2d"); if(!ctx){raf=requestAnimationFrame(frame);return;}
      const rect=c.getBoundingClientRect(); const dpr=Math.min(window.devicePixelRatio||1,2);
      if(c.width!==Math.floor(rect.width*dpr)||c.height!==Math.floor(rect.height*dpr)){c.width=Math.floor(rect.width*dpr);c.height=Math.floor(rect.height*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const W=rect.width,H=rect.height,rowH=H/ROWS,colW=W/COLS;
      const dt=Math.min((t-lastRef.current)/1000||0,.04);lastRef.current=t;
      if(messageUntilRef.current && t>messageUntilRef.current){ messageUntilRef.current=0; setMessage(""); }
      if(runningRef.current && !pausedRef.current){
        for(const m of moversRef.current){m.x+=m.speed*dt;if(m.speed>0&&m.x>COLS+1)m.x=-m.width-1;if(m.speed<0&&m.x+m.width<-1)m.x=COLS+1;}
        const p=playerRef.current;
        const goal=stageOf(levelRef.current).goal;
        if(p.y===0&&goal.type==="top"){
          advanceStage();
        } else if(p.y>0&&p.y<10&&p.y!==5){
          const lane=LANE_TYPES[p.y];
          const hits=moversRef.current.filter(m=>m.row===p.y&&p.x+.65>m.x&&p.x+.35<m.x+m.width);
          const isExit=goal.type==="side"&&p.y===goal.row;
          const safe = isExit ? hits.length===0 : lane==="hazard" ? hits.length===0 : hits.some(h=>h.kind!=="hazard");
          if(!safe){
            livesRef.current--;setLives(livesRef.current);setMessage("Missed the branch!");
            messageUntilRef.current=t+900;
            resetPlayer();
            if(livesRef.current<=0){syncBest(scoreRef.current);runningRef.current=false;setRunning(false);setMessage("The jungle wins this round.");}
          } else if(!isExit&&lane!=="hazard"&&hits[0]){
            p.x+=hits[0].speed*dt;
            if(p.x<-.4||p.x>COLS-.6){livesRef.current--;setLives(livesRef.current);resetPlayer();}
          }
        }
      }

      const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,"#071b12");grad.addColorStop(.55,"#0b2a1d");grad.addColorStop(1,"#06110d");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
      // Layered New Guinea canopy: foliage sprite when loaded, procedural fallback.
      const fol=spritesRef.current["foliage"];
      if(fol){
        ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=.5;
        const fs=Math.max(W/fol.width,H/fol.height),fdw=fol.width*fs,fdh=fol.height*fs;
        ctx.drawImage(fol,(W-fdw)/2,(H-fdh)/2,fdw,fdh);
        ctx.restore();
      }else{
        ctx.fillStyle="rgba(20,63,40,.42)";
        for(let i=0;i<18;i++){const x=((i*83+31)%Math.max(1,W+120))-60;const y=((i*137)%Math.max(1,H));ctx.beginPath();ctx.ellipse(x,y,42+(i%4)*10,14+(i%3)*5,(i%5)*.42,0,Math.PI*2);ctx.fill();}
      }
      ctx.strokeStyle="rgba(55,105,62,.35)";ctx.lineWidth=5;
      for(let i=0;i<7;i++){const x=(i+.5)*W/7;ctx.beginPath();ctx.moveTo(x,-20);ctx.bezierCurveTo(x-35,H*.25,x+28,H*.55,x-15,H+20);ctx.stroke();}
      const stageIndex=Math.min(levelRef.current-1,STAGES.length-1);
      const stage=STAGES[stageIndex];
      if(stageIndex===1){ctx.fillStyle="rgba(72,139,168,.12)";ctx.fillRect(0,H*.25,W,H*.55);}
      if(stageIndex===3){ctx.fillStyle="rgba(0,8,20,.44)";ctx.fillRect(0,0,W,H);for(const f of FIREFLIES){const a=.25+.45*(.5+.5*Math.sin(t/420+f.phase));ctx.fillStyle=`rgba(213,238,109,${a})`;ctx.beginPath();ctx.arc(W*f.x/100,H*f.y/100,1.7,0,Math.PI*2);ctx.fill();}}
      if(stageIndex===4){ctx.strokeStyle="rgba(190,220,235,.22)";ctx.lineWidth=1;for(let i=0;i<38;i++){const rx=(i*79+t*.08)%W,ry=(i*113+t*.18)%H;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx-9,ry+20);ctx.stroke();}}
      for(let r=0;r<ROWS;r++){
        const y=r*rowH;
        const isExitRow=stage.goal.type==="side"&&r===stage.goal.row;
        if(r===0){ctx.fillStyle="rgba(175,224,95,.16)";ctx.fillRect(0,y,W,rowH);}
        else if(isExitRow){ctx.fillStyle="rgba(255,205,90,.08)";ctx.fillRect(0,y,W,rowH);}
        else if(r===5||r===10||r===11){ctx.fillStyle="rgba(255,255,255,.035)";ctx.fillRect(0,y,W,rowH);}
        ctx.strokeStyle="rgba(255,255,255,.025)";ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
      }
      // Exit marker for side-goal stages: glowing edge + chevron on the exit limb.
      if(stage.goal.type==="side"){
        const right=stage.goal.dir==="right";
        const gy=stage.goal.row*rowH;
        const gg=ctx.createLinearGradient(right?W:0,0,right?W-84:84,0);
        gg.addColorStop(0,"rgba(255,205,90,.45)");gg.addColorStop(1,"rgba(255,205,90,0)");
        ctx.fillStyle=gg;ctx.fillRect(right?W-84:0,gy,84,rowH);
        const bob=Math.sin(t/280)*4;
        ctx.fillStyle="rgba(255,220,130,.95)";ctx.textAlign="center";
        ctx.font=`900 ${Math.max(16,rowH*.42)}px system-ui`;
        ctx.fillText(right?"❯":"❮",right?W-26:26,gy+rowH*.68+bob);
        ctx.font=`700 ${Math.max(10,rowH*.2)}px system-ui`;ctx.fillStyle="rgba(255,225,150,.75)";
        ctx.fillText("EXIT",W/2,gy+rowH*.62);
        ctx.textAlign="start";
      }
      ctx.font=`${Math.max(10,rowH*.22)}px system-ui`;ctx.fillStyle="rgba(220,255,225,.55)";
      if(stage.goal.type==="top") ctx.fillText("CROWN",12,rowH*.55);
      ctx.textAlign="center";ctx.font=`700 ${Math.max(10,rowH*.18)}px system-ui`;ctx.fillStyle="rgba(230,246,218,.72)";ctx.fillText(stage.subtitle.toUpperCase(),W/2,rowH*.55);ctx.textAlign="start";

      for(const m of moversRef.current){
        const x=m.x*colW,y=m.row*rowH+rowH*.28,w=m.width*colW,h=rowH*.44;
        const spr=spritesRef.current[m.kind==="hazard"?"predator":m.kind];
        if(spr){
          ctx.save();ctx.globalCompositeOperation="screen";
          if(m.kind==="hazard"){
            const dw=colW*1.5,dh=dw*spr.height/spr.width;
            ctx.drawImage(spr,x+w/2-dw/2,y+h/2-dh/2,dw,dh);
          }else{
            const dh=rowH*(m.kind==="vine"?0.95:1.25);
            ctx.drawImage(spr,x,y+h/2-dh/2,w,dh);
          }
          ctx.restore();
        }else if(m.kind==="hazard"){
          ctx.fillStyle="#6d2b27";ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w*.42,h*.36,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#d9b26f";ctx.beginPath();ctx.arc(x+w*.72,y+h*.32,3,0,Math.PI*2);ctx.fill();
        }else{
          ctx.lineCap="round";ctx.strokeStyle=m.kind==="vine"?"#4f8c3b":"#755238";ctx.lineWidth=Math.max(7,h*.45);
          ctx.beginPath();ctx.moveTo(x,y+h*.5);ctx.lineTo(x+w,y+h*.5);ctx.stroke();
          ctx.strokeStyle=m.kind==="vine"?"#87b94e":"#a8794f";ctx.lineWidth=2;ctx.stroke();
          ctx.fillStyle="rgba(111,177,69,.8)";
          for(let j=0;j<3;j++){ctx.beginPath();ctx.ellipse(x+w*(.2+j*.3),y+h*.1+(j%2)*h*.75,8,4,j*.7,0,Math.PI*2);ctx.fill();}
        }
      }

      // Insects: bonus pickups scattered per stage.
      for(const s of insectsRef.current){
        const ix=(s.x+.5)*colW,iy=(s.y+.55)*rowH;
        const pulse=.6+.4*Math.sin(t/350+s.x*1.7+s.y);
        ctx.fillStyle=`rgba(255,190,80,${.28*pulse})`;
        ctx.beginPath();ctx.arc(ix,iy,10,0,Math.PI*2);ctx.fill();
        const bug=spritesRef.current["insect"];
        if(bug){
          ctx.save();ctx.globalCompositeOperation="screen";
          const bd=colW*1.05;
          ctx.drawImage(bug,ix-bd/2,iy-bd/2,bd,bd);
          ctx.restore();
        }else{
          ctx.fillStyle="#ffcf6e";
          ctx.beginPath();ctx.ellipse(ix,iy,4.2,3,.5,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#7a4a12";
          ctx.beginPath();ctx.arc(ix+1.5,iy-.5,1.4,0,Math.PI*2);ctx.fill();
        }
      }

      const p=playerRef.current;const px=(p.x+.5)*colW,py=(p.y+.55)*rowH;
      const facing=facingRef.current;
      const mon=spritesRef.current[`monitor-${facing}`];
      if(mon){
        ctx.save();ctx.globalCompositeOperation="screen";
        const dw=colW*(facing==="up"||facing==="down"?1.35:1.7);
        const dh=dw*mon.height/mon.width;
        ctx.drawImage(mon,px-dw/2,py-dh/2,dw,dh);
        ctx.restore();
      }else{
      ctx.save();ctx.translate(px,py);
      const angle=facing==="up"?-Math.PI/2:facing==="down"?Math.PI/2:facing==="left"?Math.PI:0;
      ctx.rotate(angle);
      const s=Math.min(colW/76,rowH/54);
      ctx.scale(s,s);
      // Baby blue tree monitor: long slender body, banded tail, turquoise/black pattern.
      ctx.lineCap="round";ctx.lineJoin="round";
      ctx.strokeStyle="#071314";ctx.lineWidth=8;
      ctx.beginPath();ctx.moveTo(-18,1);ctx.bezierCurveTo(-38,5,-54,19,-61,8);ctx.bezierCurveTo(-68,-3,-53,-15,-43,-10);ctx.stroke();
      ctx.strokeStyle="#59cbd1";ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(-18,1);ctx.bezierCurveTo(-38,5,-54,19,-61,8);ctx.bezierCurveTo(-68,-3,-53,-15,-43,-10);ctx.stroke();
      ctx.fillStyle="#58cbd1";ctx.strokeStyle="#071314";ctx.lineWidth=3;
      ctx.beginPath();ctx.ellipse(-4,0,25,10,-.03,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(13,-8);ctx.quadraticCurveTo(31,-10,39,-4);ctx.quadraticCurveTo(42,0,37,4);ctx.quadraticCurveTo(25,9,12,7);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle="#071314";ctx.lineWidth=4;
      for(const yy of [-1,1]) for(const xx of [-1,1]){
        ctx.beginPath();ctx.moveTo(xx<0?-10:7,yy*6);ctx.lineTo((xx<0?-20:17),yy*15);ctx.lineTo((xx<0?-28:25),yy*16);ctx.stroke();
      }
      ctx.strokeStyle="#163c42";ctx.lineWidth=3;
      for(const bx of [-18,-10,-2,6]){ctx.beginPath();ctx.moveTo(bx,-8);ctx.lineTo(bx+3,8);ctx.stroke();}
      ctx.strokeStyle="#173a40";ctx.lineWidth=2;
      for(const tx of [-48,-40,-32]){ctx.beginPath();ctx.moveTo(tx,-4);ctx.lineTo(tx+2,7);ctx.stroke();}
      ctx.fillStyle="#d8edf0";ctx.beginPath();ctx.ellipse(28,-4,4.5,3.6,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#5b3218";ctx.beginPath();ctx.arc(29,-4,2.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#0a0b08";ctx.beginPath();ctx.arc(29.5,-4,1.1,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#e9f4dd";ctx.beginPath();ctx.arc(36,-1,1.1,0,Math.PI*2);ctx.fill();
      ctx.restore();
      }

      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
  },[resetPlayer,advanceStage]);

  const onTouchStart=(e:any)=>{const t=e.changedTouches[0];touchRef.current={x:t.clientX,y:t.clientY};};
  const onTouchEnd=(e:any)=>{const s=touchRef.current;if(!s)return;const t=e.changedTouches[0],dx=t.clientX-s.x,dy=t.clientY-s.y;if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;if(Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1,0);else move(0,dy>0?1:-1);touchRef.current=null;};

  const hudStage=stageOf(level);
  return <main style={{minHeight:"100svh",background:"#030806",color:"#edf7e9",fontFamily:"system-ui,sans-serif",padding:narrow?"10px":"18px"}}>
    <div style={{maxWidth:760,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,marginBottom:12}}>
        <div><div style={{fontSize:12,letterSpacing:3,color:"#8ebc77"}}>ARBOREAL PLANET ARCADE · PROTOTYPE</div><h1 style={{margin:"3px 0 0",fontSize:"clamp(28px,6vw,54px)",lineHeight:.95}}>CANOPY CROSSING</h1></div>
        <div style={{textAlign:"right",fontWeight:800,fontSize:14}}>SCORE {score} · BEST {best} · 🪲 {bugs}<br/><span style={{color:"#e2605c"}}>{"♥".repeat(Math.max(0,lives))}</span><br/>{hudStage.name.toUpperCase()}<br/><span style={{fontSize:11,color:"#9dc98f",letterSpacing:1}}>{objectiveOf(hudStage)}</span></div>
      </header>
      <div style={{position:"relative"}}>
      <section style={{position:"relative",height:narrow?"min(50svh,480px)":"min(72svh,760px)",minHeight:narrow?340:520,border:"1px solid #315b3a",borderRadius:20,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.55)",touchAction:"none"}} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <canvas ref={canvasRef} style={{width:"100%",height:"100%",display:"block"}} aria-label="Canopy Crossing game"/>
        {(running&&message)&&<div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:"min(82%,420px)",padding:22,textAlign:"center",borderRadius:18,background:"rgba(2,10,7,.88)",border:"1px solid rgba(159,213,117,.35)",backdropFilter:"blur(8px)"}}>
          <strong style={{fontSize:20}}>{message}</strong>
        </div>}
      </section>
      {!running&&<div style={{position:"absolute",inset:0,display:"flex",overflowY:"auto",padding:12,borderRadius:20}}>
        <div style={{width:"min(88%,380px)",margin:"auto",padding:narrow?14:22,textAlign:"center",borderRadius:18,background:"rgba(2,10,7,.92)",border:"1px solid rgba(159,213,117,.35)",backdropFilter:"blur(8px)"}}>
          <strong style={{fontSize:narrow?22:30}}>CLIMB THE CANOPY</strong>
          <img src="/arcade/canopy-crossing/monitor-up.webp" alt="Baby blue tree monitor" style={{width:narrow?104:170,margin:"-6px auto 4px",display:"block",mixBlendMode:"screen"}}/>
          <p style={{color:"#b9c9b7",lineHeight:1.5,fontSize:narrow?13:16,margin:"6px 0 12px"}}>Guide a baby blue tree monitor through five escalating New Guinea canopy stages. Some climbs end at the crown — others at the far bank. Ride branches and vines, grab insects, dodge predators.</p>
          <button onClick={start} style={{border:0,borderRadius:999,padding:"13px 24px",fontWeight:900,fontSize:16,cursor:"pointer",background:"#a8d96f",color:"#10200d"}}>{lives<=0?"PLAY AGAIN":"START ASCENT"}</button>
        </div>
      </div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:300,margin:"14px auto 0",userSelect:"none"}}>
        <span/><button onClick={()=>move(0,-1)} style={btn}>▲</button><span/>
        <button onClick={()=>move(-1,0)} style={btn}>◀</button><button onClick={()=>move(0,1)} style={btn}>▼</button><button onClick={()=>move(1,0)} style={btn}>▶</button>
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:10}}><button onClick={togglePause} style={{...btn,width:110}}>{paused?"RESUME":"PAUSE"}</button></div>
      <p style={{textAlign:"center",fontSize:12,color:"#748579"}}>Arrow keys / WASD · swipe on mobile · P/Esc pause · best score saves on device</p>
    </div>
  </main>;
}

const btn:CSSProperties={height:46,borderRadius:12,border:"1px solid #315b3a",background:"#0d1c14",color:"#dcebd6",fontSize:18,fontWeight:900,cursor:"pointer"};
