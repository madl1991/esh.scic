/* =====================================================================
   login-seasonal.js — seasonal animated effects for the ESH login screen
   Supplementary lang: nasa ibabaw ng #login-overlay, pointer-events:none,
   kaya hindi naaapektuhan ang login form / layout.
   Ang effects ay nasa loob ng RIGHT PANEL (.login-right-panel) lang,
   sa LIKOD ng form at mga teksto.

   Petsa (auto):  Halloween Oct 26–Nov 2 · Christmas Nov 3–Dec 31
                  New Year Jan 1–4 · Valentine’s Feb 1–14 · Independence Jun 1–12
   Test sa totoong login:  index.html?fx=halloween | christmas | newyear |
                           valentine | independence | off
   CSS: nasa styles.css (section “LOGIN — SEASONAL EFFECTS”).
   Para tanggalin: burahin ang <script src="login-seasonal.js"> sa index.html
   at ang CSS section na iyon.
   ===================================================================== */
(function(){
  var ov = document.getElementById('login-overlay');
  if (!ov) return;
  var fx = document.createElement('div');
  fx.id = 'esh-fx'; fx.setAttribute('aria-hidden','true');
  // Nasa LOOB ng right panel, sa likod ng form/teksto
  var rp = ov.querySelector('.login-right-panel');
  (rp || ov).insertBefore(fx, (rp || ov).firstChild);

  // range = [MMDD start, MMDD end]
  var EVENTS = {
    halloween:   {name:'Halloween',   range:[1026,1102], layers:[
      {mode:'rise', sprite:['ghost','pumpkin'], rot:12, n:6, s:[46,72], d:[14,22]},
      {mode:'fly', bat:true, n:4, s:[38,66], d:[12,22]}]},
    christmas:   {name:'Christmas',   range:[1103,1231], layers:[
      {mode:'fall', e:['❄️','❄️','❄️','🎄','🎁','⭐'], n:14, s:[12,20], d:[24,36]}]},
    newyear:     {name:'New Year',    range:[101,104],   layers:[
      {fireworks:true}]},
    valentine:   {name:'Valentine’s', range:[201,214],   layers:[
      {mode:'rise', e:['❤️','💖','💕','💗','💘'], n:10, s:[14,22], d:[22,32]}]},
    independence:{name:'Independence Day', range:[601,612], layers:[
      {pole:true}]}
  };
  var cur = null;
  var r = function(a,b){return a+Math.random()*(b-a)};
  function FW(){ return fx.clientWidth || innerWidth; }
  function FH(){ return fx.clientHeight || innerHeight; }

  // Ilagay ang effects layer sa ibabaw ng right panel lang
  function place(){
    fx.style.setProperty('--fw', FW() + 'px');
    fx.style.setProperty('--fh', FH() + 'px');
  }
  // Keyframes na sumusunod sa laki ng right panel (imbes na buong screen)
  var kf = document.createElement('style');
  kf.textContent =
    '#esh-fx{z-index:0!important}.login-right-panel{position:relative}.login-right-panel>.login-right-inner{position:relative;z-index:1}'+
    '@keyframes fxfall{from{transform:translate3d(0,calc(var(--fh)*-.12),0) rotate(0)}to{transform:translate3d(var(--dx),calc(var(--fh)*1.12),0) rotate(var(--rot))}}'+
    '@keyframes fxrise{from{transform:translate3d(0,calc(var(--fh)*1.12),0) rotate(0)}to{transform:translate3d(var(--dx),calc(var(--fh)*-.12),0) rotate(var(--rot))}}'+
    '@keyframes fxfly{0%{transform:translate3d(calc(var(--fw)*-.12),0,0) rotate(-8deg)}25%{transform:translate3d(calc(var(--fw)*.2),-24px,0) rotate(8deg)}50%{transform:translate3d(calc(var(--fw)*.5),16px,0) rotate(-8deg)}75%{transform:translate3d(calc(var(--fw)*.8),-20px,0) rotate(8deg)}100%{transform:translate3d(calc(var(--fw)*1.12),0,0) rotate(-8deg)}}';
  document.head.appendChild(kf);

  var BAT='<svg viewBox="0 0 64 32" style="display:block;width:100%;overflow:visible"><g class="bw l"><path d="M30 15C24 5 12 4 1 11c6-1 9 2 12 6 2-3 6-3 8 1 2-2 5-2 9 1z" fill="#2a1a3d"/></g><g class="bw r"><path d="M34 15C40 5 52 4 63 11c-6-1-9 2-12 6-2-3-6-3-8 1-2-2-5-2-9 1z" fill="#2a1a3d"/></g><ellipse cx="32" cy="17" rx="4" ry="7" fill="#1b102a"/><circle cx="32" cy="10" r="3.6" fill="#1b102a"/><polygon points="29,8 28,2.5 31.5,6" fill="#1b102a"/><polygon points="35,8 36,2.5 32.5,6" fill="#1b102a"/><circle cx="30.8" cy="10" r=".8" fill="#f97316"/><circle cx="33.2" cy="10" r=".8" fill="#f97316"/></svg>';

  var SPR={ghost:'<svg class="gh" viewBox="0 0 60 72"><defs><linearGradient id="eshGhg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e2dbf8"/></linearGradient></defs><g class="gt"><path d="M8 34C8 14 18 4 30 4C42 4 52 14 52 34L52 62C52 67 49 67 47 63C44 59 42 67 39 67C36 67 35 60 30 60C25 60 24 67 21 67C18 67 16 59 13 63C11 67 8 67 8 62Z" fill="url(#eshGhg)" stroke="#b7aee0" stroke-width="1.4" stroke-linejoin="round"/><ellipse class="ge" cx="22" cy="30" rx="3.2" ry="4.6" fill="#2b2540"/><ellipse class="ge" cx="38" cy="30" rx="3.2" ry="4.6" fill="#2b2540"/><ellipse cx="30" cy="42" rx="4" ry="5.5" fill="#2b2540"/><ellipse cx="14" cy="38" rx="3.6" ry="2.2" fill="#ffb3c7" opacity=".6"/><ellipse cx="46" cy="38" rx="3.6" ry="2.2" fill="#ffb3c7" opacity=".6"/></g><ellipse class="gal" cx="6" cy="42" rx="7" ry="4" fill="url(#eshGhg)" stroke="#b7aee0" stroke-width="1.2"/><ellipse class="gar" cx="54" cy="42" rx="7" ry="4" fill="url(#eshGhg)" stroke="#b7aee0" stroke-width="1.2"/></svg>',pumpkin:'<svg class="pk" viewBox="0 0 70 66"><defs><radialGradient id="eshPkg" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffb347"/><stop offset=".6" stop-color="#f77f00"/><stop offset="1" stop-color="#c2410c"/></radialGradient></defs><path d="M31 18C31 10 34 6 39 5L41 9C38 10 37 13 37 18z" fill="#5a7d2a"/><ellipse cx="22" cy="40" rx="17" ry="22" fill="url(#eshPkg)" stroke="#b34a06" stroke-width="1.2"/><ellipse cx="48" cy="40" rx="17" ry="22" fill="url(#eshPkg)" stroke="#b34a06" stroke-width="1.2"/><ellipse cx="35" cy="40" rx="17" ry="24" fill="url(#eshPkg)" stroke="#b34a06" stroke-width="1.2"/><path d="M26 18C20 30 20 50 26 62M44 18C50 30 50 50 44 62" stroke="#c2570a" stroke-width="1.2" fill="none" opacity=".7"/><g class="pf" stroke="#7c2d05" stroke-width=".8" stroke-linejoin="round" fill="#ffd43b"><polygon points="21,36 30,36 25.5,27"/><polygon points="40,36 49,36 44.5,27"/><polygon points="35,39 32,44 38,44"/><polygon points="21,47 27,50 31,47 35,51 39,47 43,50 49,47 45,57 25,57"/></g></svg>'};
  // PH flag: canvas (crisp, supersampled) + tuloy-tuloy na alon, hindi hiwa-hiwa
  var flags=[], flRAF=0;
  function flStop(){ cancelAnimationFrame(flRAF); flRAF=0; flags=[]; }
  function star(c,cx,cy,R,a0){ c.beginPath(); for (var i=0;i<10;i++){ var a=(a0+i*36)*Math.PI/180, q=i%2?R*.42:R; c[i?'lineTo':'moveTo'](cx+q*Math.cos(a), cy+q*Math.sin(a)); } c.closePath(); c.fill(); }
  function drawFlag(c,k){
    c.save(); c.scale(k,k);
    c.fillStyle='#0038a8'; c.fillRect(0,0,60,15.02);
    c.fillStyle='#ce1126'; c.fillRect(0,15,60,15);
    c.fillStyle='#fff'; c.beginPath(); c.moveTo(0,0); c.lineTo(26,15); c.lineTo(0,30); c.closePath(); c.fill();
    c.fillStyle='#fcd116'; c.strokeStyle='#fcd116'; c.lineCap='round'; c.lineWidth=.6;
    c.beginPath(); c.arc(8.67,15,3.5,0,6.2832); c.fill();
    for (var i=0;i<24;i++){ var a=i*Math.PI/12, o=i%3?5.9:6.8, co=Math.cos(a), si=Math.sin(a);
      c.beginPath(); c.moveTo(8.67+4.3*co,15+4.3*si); c.lineTo(8.67+o*co,15+o*si); c.stroke(); }
    star(c,3.7,4.6,2.6,-129); star(c,3.7,25.4,2.6,129); star(c,22.4,15,2.6,0);
    c.restore();
  }
  function buildFlag(p, w){
    var dpr=Math.max(2,Math.min(window.devicePixelRatio||1,3)), h=w/2, amp=w*.05, pad=Math.ceil(amp*1.7);
    var cv=document.createElement('canvas'); cv.width=Math.round(w*dpr); cv.height=Math.round((h+pad*2)*dpr);
    cv.style.cssText='display:block;width:'+w+'px;height:'+(h+pad*2)+'px';
    var src=document.createElement('canvas'); src.width=cv.width; src.height=Math.round(h*dpr);
    drawFlag(src.getContext('2d'), src.width/60);
    p.style.width=w+'px'; p.style.height=(h+pad*2)+'px'; p.appendChild(cv);
    flags.push({cv:cv, c:cv.getContext('2d'), src:src, amp:amp*dpr, pad:pad*dpr, ph:Math.random()*6});
    if (!flRAF) flRAF=requestAnimationFrame(flFrame);
  }
  function flFrame(ts){
    var t=ts/1000;
    flags.forEach(function(f){
      var c=f.c, W=f.cv.width, H=f.src.height, st=2, sh=[];
      c.globalCompositeOperation='source-over'; c.clearRect(0,0,W,f.cv.height);
      for (var x=0;x<W;x+=st){
        var u=x/W, k=.3+.7*u, a=u*6.8-t*3.2+f.ph;
        var y=f.pad+(Math.sin(a)*f.amp+Math.sin(a*.5+1.3)*f.amp*.25)*k;
        c.drawImage(f.src,x,0,st,H,x,y,st+.7,H);
        sh.push(Math.cos(a)*.24*k);
      }
      c.globalCompositeOperation='source-atop';
      for (var i=0;i<sh.length;i++){ var s=sh[i];
        c.fillStyle = s>0 ? 'rgba(0,0,0,'+s.toFixed(3)+')' : 'rgba(255,255,255,'+(-s*.7).toFixed(3)+')';
        c.fillRect(i*st,0,st,f.cv.height); }
    });
    flRAF=requestAnimationFrame(flFrame);
  }

  // Pinoy na nagwawagayway ng flag: poste na umiindayog + wavy na tela
  function poleFlags(){
    var W=FW(), fw=Math.max(110,Math.min(210,W*.2)), ph=fw*2.2;
    [[W*.03,0],[W-fw-W*.03-8,-1.2]].forEach(function(o){
      var pole=document.createElement('div'); pole.className='fxpole';
      pole.style.cssText='left:'+o[0]+'px;height:'+ph+'px;animation-delay:'+o[1]+'s';
      var fl=document.createElement('div'); fl.style.cssText='position:absolute;top:4px;left:5px';
      buildFlag(fl,fw); pole.appendChild(fl);
      var ball=document.createElement('i'); ball.className='fxball'; pole.appendChild(ball);
      fx.appendChild(pole);
    });
  }

  // Fireworks display (canvas)
  var fwRAF=0, fwCv=null;
  function fwStop(){ cancelAnimationFrame(fwRAF); fwRAF=0; fwCv=null; }
  function fwStart(){
    var cv=document.createElement('canvas'); cv.style.cssText='position:absolute;inset:0;width:100%;height:100%';
    fx.appendChild(cv); fwCv=cv;
    var ctx=cv.getContext('2d'), W, H, dpr=Math.min(window.devicePixelRatio||1,2);
    function size(){ if(fwCv!==cv){removeEventListener('resize',size);return} W=FW(); H=FH(); cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
    size(); addEventListener('resize',size);
    var COL=['#f59e0b','#ef4444','#ec4899','#8b5cf6','#3b82f6','#10b981','#eab308'];
    var rockets=[], parts=[], next=0;
    function launch(){ rockets.push({x:r(.12,.88)*W, y:H, vx:r(-.5,.5), vy:-r(8,11), ty:r(.12,.45)*H}); }
    function boom(x,y){
      var c=COL[Math.floor(Math.random()*COL.length)], n=Math.floor(r(50,80)), ring=Math.random()<.3, off=Math.random()*6.28;
      for (var i=0;i<n;i++){ var a=off+i/n*6.283, sp=ring?3.4:r(.8,4.6);
        parts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,dec:r(.008,.015),c:Math.random()<.2?'#f59e0b':c,h:[]}); }
    }
    function frame(t){
      if (fwCv!==cv) return;
      ctx.clearRect(0,0,W,H);
      if (t>next){ launch(); next=t+r(500,1300); }
      for (var i=rockets.length-1;i>=0;i--){ var k=rockets[i];
        ctx.strokeStyle='#f59e0b'; ctx.lineWidth=2.5; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(k.x-k.vx*4,k.y-k.vy*4); ctx.lineTo(k.x,k.y); ctx.stroke();
        k.x+=k.vx; k.y+=k.vy; k.vy*=.992;
        if (k.y<=k.ty){ boom(k.x,k.y); rockets.splice(i,1); } }
      for (var j=parts.length-1;j>=0;j--){ var p=parts[j];
        p.h.push(p.x,p.y); if (p.h.length>12) p.h.splice(0,2);
        p.vx*=.985; p.vy=p.vy*.985+.045; p.x+=p.vx; p.y+=p.vy; p.life-=p.dec;
        if (p.life<=0){ parts.splice(j,1); continue; }
        ctx.globalAlpha=Math.max(p.life,0); ctx.strokeStyle=p.c; ctx.lineWidth=2; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(p.h[0],p.h[1]); for (var q=2;q<p.h.length;q+=2) ctx.lineTo(p.h[q],p.h[q+1]); ctx.lineTo(p.x,p.y); ctx.stroke(); }
      ctx.globalAlpha=1;
      fwRAF=requestAnimationFrame(frame);
    }
    launch(); fwRAF=requestAnimationFrame(frame);
  }

  function activeByDate(d){
    d = d || new Date();
    var md = (d.getMonth()+1)*100 + d.getDate();
    for (var k in EVENTS){ var g=EVENTS[k].range; if (md>=g[0] && md<=g[1]) return k; }
    return null;
  }
  function render(key){
    fwStop(); flStop(); fx.innerHTML = ''; cur = key; place();
    if (!key || !EVENTS[key]) return;
    EVENTS[key].layers.forEach(function(L){
      if (L.pole){ poleFlags(); return; }
      if (L.fireworks){ fwStart(); return; }
      // Hatiin sa pantay na "column" para hindi magkadikit; ihalo ang pagkakasunod
      var slots = []; for (var si=0; si<L.n; si++) slots.push(si);
      for (var sj=slots.length-1; sj>0; sj--){ var sk=Math.floor(Math.random()*(sj+1)), st=slots[sj]; slots[sj]=slots[sk]; slots[sk]=st; }
      for (var i=0;i<L.n;i++){
        var p = document.createElement('span');
        p.className = 'fxp';
        var sz = r(L.s[0], L.s[1]);
        if (L.bat){ p.className += ' bat'; p.innerHTML = BAT; p.style.width = sz+'px'; p.firstChild.style.setProperty('--fs', r(.25,.42)+'s'); }
        else if (L.sprite){ p.innerHTML=SPR[L.sprite[i%L.sprite.length]]; p.style.width=sz+'px'; p.firstChild.style.animationDelay=(-r(0,3)).toFixed(2)+'s'; }
        else if (L.flag){ buildFlag(p, sz); }
        else { p.textContent = L.e[Math.floor(Math.random()*L.e.length)]; p.style.fontSize = sz + 'px'; }
        var dur = r(L.d[0], L.d[1]);
        
        p.style.left = (L.mode==='fly' ? 0 : ((slots[i] + r(.2,.8)) / L.n) * 100) + '%';
        if (L.mode==='fly') p.style.top = r(5,80) + '%';
        p.style.setProperty('--dx', (r(-.05,.05)*FW()).toFixed(1) + 'px');
        var rm = L.rot||360; p.style.setProperty('--rot', r(-rm,rm) + 'deg');
        p.style.animationName = 'fx' + L.mode;
        if (L.bat && Math.random()<.5){ p.style.animationDirection='reverse'; p.firstChild.style.transform='scaleX(-1)'; }
        p.style.animationDuration = dur + 's';
        p.style.animationDelay = (-(((i*0.618034)%1)*dur)).toFixed(2) + 's'; // pantay ang layo pataas-baba // negative = already nasa screen agad
        fx.appendChild(p);
      }
    });
  }
  window.ESHFX = {render:render, activeByDate:activeByDate, EVENTS:EVENTS};

  // ---- Takbo lang kapag nakikita ang login overlay (tipid sa CPU ng dashboard)
  var forced = null;
  try { forced = new URLSearchParams(location.search).get('fx'); } catch(e){}
  function pick(){ return forced ? (forced==='off' ? null : forced) : activeByDate(); }
  function visible(){
    if (!ov.isConnected || document.hidden) return false;
    var cs = getComputedStyle(ov);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }
  var running = false;
  function sync(){
    var v = visible();
    if (v && !running){ running = true; render(pick()); }
    else if (!v && running){ running = false; render(null); }
  }
  new MutationObserver(sync).observe(ov, {attributes:true, attributeFilter:['style','class','hidden']});
  document.addEventListener('visibilitychange', sync);
  var rt = 0;
  addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(function(){ if (running) render(pick()); }, 200); });
  window.ESHFX = {render:render, activeByDate:activeByDate, EVENTS:EVENTS};
  sync();
})();
