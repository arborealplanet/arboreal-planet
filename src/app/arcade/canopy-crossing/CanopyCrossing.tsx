"use client";

import { useCallback, useEffect, useRef, useState } from "react";\nimport type { CSSProperties } from "react";

const COLS = 9;
const ROWS = 12;
const START = { x: 4, y: 11 };
const LANE_TYPES = ["goal","branch","hazard","branch","vine","rest","branch","hazard","vine","branch","rest","start"] as const;

type Pos = { x:number; y:number };
type Mover = { row:number; x:number; width:number; speed:number; kind:"branch"|"hazard"|"vine" };

const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n));

function makeMovers(level:number): Mover[] {
  const movers: Mover[] = [];
  for (let row=1; row<=9; row++) {
    if (row===5) continue;
    const kind = LANE_TYPES[row] === "hazard" ? "hazard" : LANE_TYPES[row] === "vine" ? "vine" : "branch";
    const dir = row % 2 ? 1 : -1;
    const base = 0.42 + level * 0.035 + row * 0.012;
    for (let i=0;i<3;i++) movers.push({row,x:i*3.6+(row%3)*0.45,width:kind==="branch"?2.25:kind==="vine"?1.55:1.1,speed:dir*base,kind});
  }
  return movers;
}

export default function CanopyCrossing() {
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const moversRef = useRef<Mover[]>(makeMovers(1));
  const playerRef = useRef<Pos>({...START});
  const lastRef = useRef(0);
  const runningRef = useRef(false);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const touchRef = useRef<{x:number;y:number}|null>(null);\n  const facingRef = useRef<"up"|"down"|"left"|"right">("up");
  const [running,setRunning] = useState(false);
  const [score,setScore] = useState(0);
  const [lives,setLives] = useState(3);
  const [level,setLevel] = useState(1);
  const [message,setMessage] = useState("Reach the crown. Avoid predators. Ride the moving canopy.");\n  const messageUntilRef = useRef(0);

  const resetPlayer = useCallback(() => { playerRef.current={...START}; },[]);

  const start = useCallback(() => {
    levelRef.current=1; scoreRef.current=0; livesRef.current=3;
    moversRef.current=makeMovers(1); resetPlayer();
    setLevel(1);setScore(0);setLives(3);setMessage("");
    runningRef.current=true;setRunning(true);
  },[resetPlayer]);

  const move = useCallback((dx:number,dy:number) => {
    if(!runningRef.current) return;
    const p=playerRef.current;
    p.x=clamp(p.x+dx,0,COLS-1);
    p.y=clamp(p.y+dy,0,ROWS-1);
    if(dy<0){ scoreRef.current+=10; setScore(scoreRef.current); }
  },[]);

  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase();
      if(["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k)) e.preventDefault();
      if(k==="arrowup"||k==="w") move(0,-1);
      if(k==="arrowdown"||k==="s") move(0,1);
      if(k==="arrowleft"||k==="a") move(-1,0);
      if(k==="arrowright"||k==="d") move(1,0);
    };
    window.addEventListener("keydown",key,{passive:false});
    return()=>window.removeEventListener("keydown",key);
  },[move]);

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
      if(messageUntilRef.current && t>messageUntilRef.current){ messageUntilRef.current=0; setMessage(""); }\n      if(runningRef.current){
        for(const m of moversRef.current){m.x+=m.speed*dt;if(m.speed>0&&m.x>COLS+1)m.x=-m.width-1;if(m.speed<0&&m.x+m.width<-1)m.x=COLS+1;}
        const p=playerRef.current;
        if(p.y===0){
          levelRef.current++; scoreRef.current+=500;
          setLevel(levelRef.current);setScore(scoreRef.current);setMessage("Canopy reached! Next ascent.");
          moversRef.current=makeMovers(levelRef.current);resetPlayer();
          setTimeout(()=>setMessage(""),900);
        } else if(p.y>0&&p.y<10&&p.y!==5){
          const lane=LANE_TYPES[p.y];
          const hits=moversRef.current.filter(m=>m.row===p.y&&p.x+.65>m.x&&p.x+.35<m.x+m.width);
          const safe = lane==="hazard" ? hits.length===0 : hits.some(h=>h.kind!=="hazard");
          if(!safe){
            livesRef.current--;setLives(livesRef.current);setMessage("Missed the branch!");
            resetPlayer();
            if(livesRef.current<=0){runningRef.current=false;setRunning(false);setMessage("The jungle wins this round.");}
          } else if(lane!=="hazard"&&hits[0]){
            p.x+=hits[0].speed*dt;
            if(p.x<-.4||p.x>COLS-.6){livesRef.current--;setLives(livesRef.current);resetPlayer();}
          }
        }
      }

      const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,"#071b12");grad.addColorStop(.55,"#0b2a1d");grad.addColorStop(1,"#06110d");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);\n      // Layered New Guinea canopy silhouettes: portable procedural art, no external dependency.\n      ctx.fillStyle="rgba(20,63,40,.42)";\n      for(let i=0;i<18;i++){const x=((i*83+31)%Math.max(1,W+120))-60;const y=((i*137)%Math.max(1,H));ctx.beginPath();ctx.ellipse(x,y,42+(i%4)*10,14+(i%3)*5,(i%5)*.42,0,Math.PI*2);ctx.fill();}\n      ctx.strokeStyle="rgba(55,105,62,.35)";ctx.lineWidth=5;\n      for(let i=0;i<7;i++){const x=(i+.5)*W/7;ctx.beginPath();ctx.moveTo(x,-20);ctx.bezierCurveTo(x-35,H*.25,x+28,H*.55,x-15,H+20);ctx.stroke();}
      for(let r=0;r<ROWS;r++){
        const y=r*rowH;
        if(r===0){ctx.fillStyle="rgba(175,224,95,.16)";ctx.fillRect(0,y,W,rowH);}
        else if(r===5||r===10||r===11){ctx.fillStyle="rgba(255,255,255,.035)";ctx.fillRect(0,y,W,rowH);}
        ctx.strokeStyle="rgba(255,255,255,.025)";ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
      }
      ctx.font=`${Math.max(10,rowH*.22)}px system-ui`;ctx.fillStyle="rgba(220,255,225,.55)";ctx.fillText("CROWN",12,rowH*.55);

      for(const m of moversRef.current){
        const x=m.x*colW,y=m.row*rowH+rowH*.28,w=m.width*colW,h=rowH*.44;
        if(m.kind==="hazard"){
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

      const p=playerRef.current;const px=(p.x+.5)*colW,py=(p.y+.55)*rowH;
      ctx.save();ctx.translate(px,py);
      const facing=facingRef.current;
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

      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
  },[resetPlayer]);

  const onTouchStart=(e:any)=>{const t=e.changedTouches[0];touchRef.current={x:t.clientX,y:t.clientY};};
  const onTouchEnd=(e:any)=>{const s=touchRef.current;if(!s)return;const t=e.changedTouches[0],dx=t.clientX-s.x,dy=t.clientY-s.y;if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;if(Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1,0);else move(0,dy>0?1:-1);touchRef.current=null;};

  return <main style={{minHeight:"100svh",background:"#030806",color:"#edf7e9",fontFamily:"system-ui,sans-serif",padding:"18px"}}>
    <div style={{maxWidth:760,margin:"0 auto"}}>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,marginBottom:12}}>
        <div><div style={{fontSize:12,letterSpacing:3,color:"#8ebc77"}}>ARBOREAL PLANET ARCADE · PROTOTYPE</div><h1 style={{margin:"3px 0 0",fontSize:"clamp(28px,6vw,54px)",lineHeight:.95}}>CANOPY CROSSING</h1></div>
        <div style={{textAlign:"right",fontWeight:800,fontSize:14}}>SCORE {score}<br/>LIVES {"●".repeat(Math.max(0,lives))}<br/>ASCENT {level}</div>
      </header>
      <section style={{position:"relative",height:"min(72svh,760px)",minHeight:520,border:"1px solid #315b3a",borderRadius:20,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.55)",touchAction:"none"}} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <canvas ref={canvasRef} style={{width:"100%",height:"100%",display:"block"}} aria-label="Canopy Crossing game"/>
        {(!running||message)&&<div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:"min(82%,420px)",padding:22,textAlign:"center",borderRadius:18,background:"rgba(2,10,7,.88)",border:"1px solid rgba(159,213,117,.35)",backdropFilter:"blur(8px)"}}>
          <strong style={{fontSize:running?20:30}}>{running?message:"CLIMB THE CANOPY"}</strong>
          {!running&&<><p style={{color:"#b9c9b7",lineHeight:1.5}}>Guide a baby blue tree monitor from the forest floor to the crown. Ride branches and vines. Avoid moving predators.</p><button onClick={start} style={{border:0,borderRadius:999,padding:"13px 24px",fontWeight:900,fontSize:16,cursor:"pointer",background:"#a8d96f",color:"#10200d"}}>{lives<=0?"PLAY AGAIN":"START ASCENT"}</button></>}
        </div>}
      </section>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:300,margin:"14px auto 0",userSelect:"none"}}>
        <span/><button onClick={()=>move(0,-1)} style={btn}>▲</button><span/>
        <button onClick={()=>move(-1,0)} style={btn}>◀</button><button onClick={()=>move(0,1)} style={btn}>▼</button><button onClick={()=>move(1,0)} style={btn}>▶</button>
      </div>
      <p style={{textAlign:"center",fontSize:12,color:"#748579"}}>Arrow keys / WASD · swipe on mobile · standalone prototype with no account or database dependency</p>
    </div>
  </main>;
}

const btn:CSSProperties={height:46,borderRadius:12,border:"1px solid #315b3a",background:"#0d1c14",color:"#dcebd6",fontSize:18,fontWeight:900,cursor:"pointer"};
