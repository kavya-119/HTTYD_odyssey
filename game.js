// ================= BASIC SETUP =================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ================= SEASON BACKGROUNDS =================
const backgrounds = [
    "assets/bg_spring.png",
    "assets/bg_summer.png",
    "assets/bg_winter.png"
];

let season = 0;

const bgImg = new Image();
bgImg.src = backgrounds[season];
let bgX = 0;

// ================= DRAGON SEASONS =================

// Each dragon has 3 animation frames
const dragonSets = [
    ["assets/dragon1_1.png","assets/dragon1_2.png","assets/dragon1_3.png"], // Season 1
    ["assets/dragon2_1.png","assets/dragon2_2.png","assets/dragon2_3.png"], // Season 2
    ["assets/dragon3_1.png","assets/dragon3_2.png","assets/dragon3_3.png"]  // Season 3
];

let dragonFrames = [];
let currentDragon = 0;

// Load dragon frames dynamically
function loadDragon(set){
    dragonFrames = [];
    set.forEach(src=>{
        const img = new Image();
        img.src = src;
        dragonFrames.push(img);
    });
}

// Load first dragon initially
loadDragon(dragonSets[0]);

let dragonFrameIndex = 0;
let dragonAnimTimer = 0;
const DRAGON_ANIM_SPEED = 8;

// ================= OBJECT IMAGES =================
// ================= HOME SCREEN IMAGE =================
const homeImg = new Image();
homeImg.src = "assets/HTTYD_HOME.png";

const obstacleImg = new Image();
obstacleImg.src = "assets/obstacle.png";

const fishImg = new Image();
fishImg.src = "assets/fish.png";

const heartImg = new Image();
heartImg.src = "assets/heart.png";


// ================= AUDIO SYSTEM =================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();

// roar (long audio)
const roar = new Audio("assets/roar.mp3");

// instant hit sound buffer
let hitBuffer=null;
fetch("assets/hit.mp3")
.then(r=>r.arrayBuffer())
.then(d=>audioCtx.decodeAudioData(d))
.then(b=>hitBuffer=b);

// ================= GAME STATE =================
let gameState="start";
let score=0;
let speed=3;
let health=3;
let frame=0;
let breath=100;
let underwater=false;

// effects
let shakeTime=0;
let damageFlash=0;

// ================= PLAYER =================
const player={x:100,y:200,width:160,height:110};

// arrays
let obstacles=[];
let fishes=[];
let flames=[];
let flameParticles=[];

// ================= INPUT =================
let keys={};

document.addEventListener("keydown",e=>{
    keys[e.key]=true;

    if(gameState==="start"||gameState==="gameover"){
        startGame();
        roar.currentTime=0;
        roar.play();
    }
});
document.addEventListener("keyup",e=>keys[e.key]=false);

// ================= START =================
function startGame(){
    gameState="playing";
    score=0;
    speed=3;
    health=3;
    breath=100;
    frame=0;
    obstacles=[];
    fishes=[];
    flames=[];
    flameParticles=[];
    player.y=200;
}

// ================= DAMAGE =================
function damagePlayer(){
    if(health<=0) return;

    health--;
    shakeTime=25;
    damageFlash=14;

    // instant sound
    if(hitBuffer){
        const src=audioCtx.createBufferSource();
        src.buffer=hitBuffer;
        src.connect(audioCtx.destination);
        src.start(0);
    }
}

// ================= BACKGROUND =================
function drawBackground(){
    if(!bgImg.complete) return;

    const scale = canvas.height / bgImg.height;
    const w = bgImg.width * scale;
    const h = canvas.height;

    bgX -= speed*0.4;
    if(bgX<=-w) bgX+=w;

    for(let i=-1;i<=Math.ceil(canvas.width/w)+1;i++){
        ctx.drawImage(bgImg,bgX+i*w,0,w,h);
    }

    // water
    ctx.fillStyle="#2b6cff55";
    ctx.fillRect(0,canvas.height-80,canvas.width,80);
}

// ================= PLAYER =================
function drawPlayer(){
    dragonAnimTimer++;
    if(dragonAnimTimer>=DRAGON_ANIM_SPEED){
        dragonAnimTimer=0;
        dragonFrameIndex=(dragonFrameIndex+1)%dragonFrames.length;
    }
    ctx.drawImage(dragonFrames[dragonFrameIndex],player.x,player.y,player.width,player.height);
}

// ================= UI =================
function drawUI(){
    ctx.fillStyle="black";
    ctx.font="16px monospace";
    ctx.fillText("Score: "+Math.floor(score),10,20);

    ctx.fillText("Health:",10,40);
    for(let i=0;i<health;i++){
        ctx.drawImage(heartImg, 70 + i*22, 25, 20, 20);
    }

    ctx.fillStyle="black";
    ctx.fillRect(10,55,100,8);
    ctx.fillStyle=underwater?"#4ec3ff":"#8be0ff";
    ctx.fillRect(10,55,breath,8);
}

// ================= HELPERS =================
function spawnObstacle(){
    obstacles.push({x:canvas.width,y:Math.random()*300+50,width:45,height:45});
}

function spawnFish(){
    const waterTop=canvas.height-80;
    const waterBottom=canvas.height-15;
    fishes.push({x:canvas.width,y:Math.random()*(waterBottom-waterTop)+waterTop,width:30,height:20});
}

function hit(a,b){
    return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
}

// ================= MAIN LOOP =================
function update(){

    // SHAKE
    let shakeX=0,shakeY=0;
    if(shakeTime>0){
        shakeX=(Math.random()-0.5)*18;
        shakeY=(Math.random()-0.5)*18;
        shakeTime--;
    }

    ctx.save();
    ctx.translate(shakeX,shakeY);

    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawBackground();

    // START SCREEN
    if(gameState==="start"){

        if(homeImg.complete){
            ctx.drawImage(homeImg, 0, 0, canvas.width, canvas.height);
        }

    // Press play text
        ctx.fillStyle="white";
        ctx.font="28px monospace";
        ctx.textAlign="center";
        if(Math.floor(frame/30)%2===0){
            ctx.fillText("Press Any Key To Start", canvas.width/2, canvas.height-80);
        }

        ctx.restore();
        requestAnimationFrame(update);
        return;
    }

    // GAME OVER
    if(gameState==="gameover"){
        ctx.fillStyle="rgba(0,0,0,0.6)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle="white";
        ctx.font="32px Times New Roman";
        ctx.fillText("GAME OVER",280,160);
        ctx.fillText("Score: "+Math.floor(score),300,200);
        ctx.restore();
        requestAnimationFrame(update);
        return;
    }

    // MOVEMENT
    let swimSpeed=underwater?2:4;
    if(keys["ArrowUp"]||keys[" "])player.y-=swimSpeed;
    if(keys["ArrowDown"])player.y+=swimSpeed;
    player.y=Math.max(0,Math.min(canvas.height-player.height,player.y));

    // BREATH
    underwater=player.y+player.height>canvas.height-80;
    if(underwater)breath-=0.35;else breath+=0.6;
    breath=Math.max(0,Math.min(100,breath));
    if(breath===0&&frame%40===0)damagePlayer();

    drawPlayer();

    // FLAME THROWER
    if(keys["f"]&&frame%2===0){
        flames.push({
            x:player.x+player.width-15,
            y:player.y+player.height/2+Math.random()*12-6,
            w:26,h:10,life:18
        });
    }

    // OBSTACLES
    if(Math.random()<0.02)spawnObstacle();
    obstacles.forEach((o,i)=>{
        o.x-=speed;
        ctx.drawImage(obstacleImg, o.x, o.y, o.width, o.height);
        if(hit(player,o)){damagePlayer();obstacles.splice(i,1);}
        if(o.x<-50)obstacles.splice(i,1);
    });

    // FISH
    if(Math.random()<0.008)spawnFish();
    fishes.forEach((f,i)=>{
        f.x-=speed;
        ctx.drawImage(fishImg, f.x, f.y, f.width, f.height);
        if(hit(player,f)){if(health<3)health++;fishes.splice(i,1);}
        if(f.x<-50)fishes.splice(i,1);
    });

    // FLAMES
    flames.forEach((flame,i)=>{
        flame.x+=7;
        flame.life--;

        const colors=["#fff176","#ff9800","#ff5722","#ff3d00"];
        ctx.fillStyle=colors[Math.floor(Math.random()*colors.length)];
        ctx.beginPath();
        ctx.ellipse(flame.x,flame.y,flame.w,flame.h,0,0,Math.PI*2);
        ctx.fill();

        flameParticles.push({x:flame.x,y:flame.y,dx:Math.random()*2-1,dy:Math.random()*2-1,life:10});

        obstacles.forEach((o,oi)=>{
            if(hit({x:flame.x-10,y:flame.y-6,width:20,height:12},o)){
                obstacles.splice(oi,1);
            }
        });

        if(flame.life<=0)flames.splice(i,1);
    });

    // PARTICLES
    flameParticles.forEach((p,i)=>{
        p.x+=p.dx;p.y+=p.dy;p.life--;
        ctx.fillStyle="rgba(255,120,0,"+(p.life/10)+")";
        ctx.fillRect(p.x,p.y,3,3);
        if(p.life<=0)flameParticles.splice(i,1);
    });

    // SPEED SCALE
    score += 0.2;
    speed = 3 + score/200;

    // season change every 500 score
    let newSeason = Math.floor(score / 500) % 3;

    if(newSeason !== season){
        season = newSeason;

    // change background
        bgImg.src = backgrounds[season];

    // change dragon
        loadDragon(dragonSets[season]);

    // trigger cloud effect
        spawnPoof();
    }

    poofCloud.forEach((p,i)=>{
        p.x += p.dx;
        p.y += p.dy;
        p.life--;

        ctx.fillStyle = "rgba(255,255,255," + (p.life/30) + ")";
        ctx.beginPath();
        ctx.arc(p.x,p.y,8,0,Math.PI*2);
        ctx.fill();

        if(p.life<=0) poofCloud.splice(i,1);
    });

    

    drawUI();
    ctx.restore();

    // RED FLASH
    if(damageFlash>0){
        ctx.fillStyle="rgba(255,0,0,0.25)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        damageFlash--;
    }

    if(health<=0)gameState="gameover";

    frame++;
    requestAnimationFrame(update);
}
// ================= DRAGON TRANSFORM EFFECT =================
let poofCloud = [];

function spawnPoof(){
    for(let i=0;i<40;i++){
        poofCloud.push({
            x:player.x+60,
            y:player.y+40,
            dx:(Math.random()-0.5)*6,
            dy:(Math.random()-0.5)*6,
            life:30
        });
    }
}

update();
