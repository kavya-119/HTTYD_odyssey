// ================= BASIC SETUP =================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ================= SEASON BACKGROUNDS =================
const backgrounds = [
    "assets/summer.png",
    "assets/monsoon.png",
    "assets/winter_final.png"
];

let season = 0;

const bgImg = new Image();
bgImg.src = backgrounds[season];
let bgX = 0;

// ================= DRAGON SEASONS =================

// Each dragon has 3 animation frames
const dragonSets = [
    ["assets/dragon1_1.png", "assets/dragon1_2.png", "assets/dragon1_3.png"], // Season 1
    ["assets/dragon2_1.png", "assets/dragon2_2.png", "assets/dragon2_3.png"], // Season 2
    ["assets/dragon3_1.png", "assets/dragon3_2.png", "assets/dragon3_3.png"]  // Season 3
];

let dragonFrames = [];
let currentDragon = 0;

// Load dragon frames dynamically
function loadDragon(set) {
    dragonFrames = [];
    set.forEach(src => {
        const img = new Image();
        img.src = src;
        dragonFrames.push(img);
    });
}

// Load first dragon initially
loadDragon(dragonSets[0]);

let dragonFrameIndex = 0;
let dragonAnimTimer = 0;
const DRAGON_ANIM_SPEED = 10; // Lower is faster

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
let hitBuffer = null;
fetch("assets/hit.mp3")
    .then(r => r.arrayBuffer())
    .then(d => audioCtx.decodeAudioData(d))
    .then(b => hitBuffer = b);

// ================= GAME STATE =================
let gameState = "start";
let showInstructions = false; // NEW: Track if instructions are shown
let score = 0;
let speed = 3;
let health = 3;
let frame = 0;
let breath = 100;
let underwater = false;

// effects
let shakeTime = 0;
let damageFlash = 0;
// NEW: Pause system
let isPaused = false;


// ================= PLAYER =================
const player = { x: 100, y: 200, width: 160, height: 110 };

// arrays
let obstacles = [];
let fishes = [];
let flames = [];
let flameParticles = [];

// ================= INPUT =================
let keys = {};

document.addEventListener("keydown", e => {
    keys[e.key] = true;

    if (e.key.toLowerCase() === "p" && gameState === "playing") {
        isPaused = !isPaused;
        return;
    }

    // Title → Instructions
    if (gameState === "start" && !showInstructions && e.key === "Enter") {
        showInstructions = true;
        return;
    }

    // Instructions → Start Game
    if (gameState === "start" && showInstructions && e.key === "Enter") {
        startGame();
        roar.currentTime = 0;
        roar.play();
        return;
    }

    // Game Over → Back to Title Screen (no instant restart)
    if (gameState === "gameover" && e.key) {
        gameState = "start";
        showInstructions = false;
        return;
    }
});
document.addEventListener("keyup", e => keys[e.key] = false);

// ================= START =================
function startGame() {
    gameState = "playing";
    showInstructions = false;
    score = 0;
    speed = 3;
    health = 3;
    breath = 100;
    frame = 0;
    obstacles = [];
    fishes = [];
    flames = [];
    flameParticles = [];
    player.y = 200;
    isPaused = false;
}

// ================= DAMAGE =================
function damagePlayer() {
    if (health <= 0) return;

    health--;
    shakeTime = 25;
    damageFlash = 14;

    // instant sound
    if (hitBuffer) {
        const src = audioCtx.createBufferSource();
        src.buffer = hitBuffer;
        src.connect(audioCtx.destination);
        src.start(0);
    }
}

// ================= BACKGROUND =================
function drawBackground() {
    if (!bgImg.complete) return;

    const scale = canvas.height / bgImg.height;
    const w = bgImg.width * scale;
    const h = canvas.height;

    bgX -= speed * 0.4;
    if (bgX <= -w) bgX += w;

    for (let i = -1; i <= Math.ceil(canvas.width / w) + 1; i++) {
        ctx.drawImage(bgImg, bgX + i * w, 0, w, h);
    }

    // water
    ctx.fillStyle = "#2b6cff55";
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
}

// ================= PLAYER =================
function drawPlayer() {
    dragonAnimTimer++;
    if (dragonAnimTimer >= DRAGON_ANIM_SPEED) {
        dragonAnimTimer = 0;
        dragonFrameIndex = (dragonFrameIndex + 1) % dragonFrames.length;
    }
    ctx.drawImage(dragonFrames[dragonFrameIndex], player.x, player.y, player.width, player.height);
}

// ================= UI =================
function drawUI() {
    ctx.fillStyle = "black";
    ctx.font = "16px monospace";
    ctx.fillText("Score: " + Math.floor(score), 10, 20);

    ctx.fillText("Health:", 10, 40);
    for (let i = 0; i < health; i++) {
        ctx.drawImage(heartImg, 70 + i * 22, 25, 20, 20);
    }

    ctx.fillStyle = "black";
    ctx.fillRect(10, 55, 100, 8);
    ctx.fillStyle = underwater ? "#4ec3ff" : "#8be0ff";
    ctx.fillRect(10, 55, breath, 8);
}

// ================= HELPERS =================
function spawnObstacle() {
    obstacles.push({ x: canvas.width, y: Math.random() * 300 + 50, width: 45, height: 45 });
}

function spawnFish() {
    const waterTop = canvas.height - 80;
    const waterBottom = canvas.height - 15;
    fishes.push({ x: canvas.width, y: Math.random() * (waterBottom - waterTop) + waterTop, width: 30, height: 20 });
}

function hit(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// ================= MAIN LOOP =================
function update() {

    // SHAKE EFFECT
    let shakeX = 0, shakeY = 0;
    if (shakeTime > 0) {
        shakeX = (Math.random() - 0.5) * 18;
        shakeY = (Math.random() - 0.5) * 18;
        shakeTime--;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    // ================= TITLE SCREEN (Page 1) =================
    if (gameState === "start" && !showInstructions) {

        if (homeImg.complete) {
            ctx.drawImage(homeImg, 0, 0, canvas.width, canvas.height);
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";

        ctx.font = "bold 48px monospace";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 15;
        ctx.fillText("HOW TO TRAIN YOUR DRAGON", canvas.width / 2, 140);

        ctx.shadowBlur = 8;
        ctx.font = "28px monospace";
        ctx.fillText("FLYING ADVENTURE", canvas.width / 2, 190);

        ctx.shadowBlur = 0;
        ctx.font = "26px monospace";
        if (Math.floor(frame / 25) % 2 === 0) {
            ctx.fillText("PRESS ENTER TO CONTINUE", canvas.width / 2, canvas.height - 100);
        }

        ctx.restore();
        requestAnimationFrame(update);
        return;
    }

    // ================= INSTRUCTIONS SCREEN (Page 2) =================
    if (gameState === "start" && showInstructions) {

        if (homeImg.complete) {
            ctx.drawImage(homeImg, 0, 0, canvas.width, canvas.height);
        }

        // Black transparent layer
        ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.shadowBlur = 0;

        let y = 95;

        ctx.font = "bold 38px monospace";
        ctx.fillText("GAME INSTRUCTIONS", 90, y);
        y += 65;

        ctx.font = "21px monospace";

        ctx.fillText("↑  Up / SPACE   →   Swim / Fly Up",          110, y);   y += 38;
        ctx.fillText("↓  Down         →   Swim / Fly Down",        110, y);   y += 38;
        ctx.fillText("F               →   Fire Breath (Attack)",   110, y);   y += 38;
        ctx.fillText("P               →   Pause / Resume",         110, y);   y += 55;

        ctx.fillStyle = "#7cff7c";
        ctx.fillText("🐟  Collect Fish   →   Restore 1 Heart",     110, y);
        y += 78;

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";
        if (Math.floor(frame / 25) % 2 === 0) {
            ctx.fillText("PRESS ENTER TO START GAME", canvas.width / 2, canvas.height - 30);
        }

        ctx.restore();
        requestAnimationFrame(update);
        return;
    }

    // ================= GAME OVER SCREEN =================
    if (gameState === "gameover") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        ctx.font = "bold 46px monospace";
        ctx.fillText("GAME OVER", canvas.width / 2, 160);

        ctx.font = "32px monospace";
        ctx.fillText("SCORE: " + Math.floor(score), canvas.width / 2, 230);

        ctx.font = "22px monospace";
        if (Math.floor(frame / 30) % 2 === 0) {
            ctx.fillText("PRESS ANY KEY TO RETURN TO MENU", canvas.width / 2, canvas.height - 90);
        }

        ctx.restore();
        requestAnimationFrame(update);
        return;
    }

    // ================= PAUSE SCREEN =================
    if (isPaused) {
        drawPlayer();
        drawUI();

        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        ctx.font = "48px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 30);

        ctx.font = "22px monospace";
        ctx.fillText("Press P to Resume", canvas.width / 2, canvas.height / 2 + 40);

        ctx.restore();
        requestAnimationFrame(update);
        return;
    }

    // ================= NORMAL GAMEPLAY =================

    // MOVEMENT
    let swimSpeed = underwater ? 2 : 4; // Faster movement==>(3/6)
    if (keys["ArrowUp"] || keys[" "]) player.y -= swimSpeed;
    if (keys["ArrowDown"]) player.y += swimSpeed;
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

    // BREATH
    underwater = player.y + player.height > canvas.height - 80;
    if (underwater) breath -= 0.35; 
    else breath += 0.6;
    breath = Math.max(0, Math.min(100, breath));
    if (breath === 0 && frame % 40 === 0) damagePlayer();

    drawPlayer();

    // ================= BETTER FIRE BREATH (Fixed Overlap + Nice Look) =================
    if (keys["f"] && frame % 3 === 0) {
        for (let i = 0; i < 8; i++) {
            flameParticles.push({
                x: player.x + player.width - 15,     // Moved back so it doesn't cover the dragon's face
                y: player.y + player.height / 2 + (Math.random() * 20 - 5),
                dx: 5.8 + Math.random() * 3.2,       // Short range
                dy: (Math.random() - 0.5) * 3.0,
                life: 15 + Math.random() * 9,
                size: 6.5 + Math.random() * 8,
                alpha: 1.0
            });
        }
    }

    // Update & Draw Fire Particles
    for (let i = flameParticles.length - 1; i >= 0; i--) {
        const p = flameParticles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.dy *= 0.95;
        p.life--;
        p.alpha = p.life / 22;

        if (p.life <= 0) {
            flameParticles.splice(i, 1);
            continue;
        }

        const intensity = p.alpha;

        // Color variety: bright yellow → orange → dark red
        let r, g, b;
        if (p.life > 14) {
            r = 255; g = 235; b = 80;      // hot yellow
        } else if (p.life > 9) {
            r = 255; g = 155; b = 30;      // vibrant orange
        } else {
            r = 195; g = 70; b = 15;       // deep red-orange
        }

        ctx.save();
        ctx.globalAlpha = p.alpha * 0.94;

        // Main flame - rounded and organic
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        const w = p.size * intensity * 1.2;
        const h = p.size * intensity * 0.75;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, w, h, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bright yellow core
        if (p.life > 11) {
            ctx.globalAlpha = p.alpha * 0.75;
            ctx.fillStyle = "#ffeb3b";
            ctx.beginPath();
            ctx.arc(p.x - 7, p.y, p.size * intensity * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Small sparks
        if (Math.random() < 0.09 && p.life > 8) {
            flameParticles.push({
                x: p.x + (Math.random() - 0.5) * 10,
                y: p.y + (Math.random() - 0.5) * 6,
                dx: p.dx * 0.6 + (Math.random() - 0.5) * 2.5,
                dy: p.dy - 1.6,
                life: 6 + Math.random() * 5,
                size: 3,
                alpha: 0.85
            });
        }

        // Hit obstacles
        for (let oi = obstacles.length - 1; oi >= 0; oi--) {
            const hitBox = { 
                x: p.x - p.size * 0.8, 
                y: p.y - p.size * 0.7, 
                width: p.size * 1.6, 
                height: p.size * 1.4 
            };
            if (hit(hitBox, obstacles[oi])) {
                obstacles.splice(oi, 1);
            }
        }
    }

    // OBSTACLES
    if (Math.random() < 0.02) spawnObstacle();
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x -= speed;
        ctx.drawImage(obstacleImg, o.x, o.y, o.width, o.height);
        if (hit(player, o)) {
            damagePlayer();
            obstacles.splice(i, 1);
        }
        if (o.x < -50) obstacles.splice(i, 1);
    }

    // FISH
    if (Math.random() < 0.008) spawnFish();
    for (let i = fishes.length - 1; i >= 0; i--) {
        const f = fishes[i];
        f.x -= speed;
        ctx.drawImage(fishImg, f.x, f.y, f.width, f.height);
        if (hit(player, f)) {
            if (health < 3) health++;
            fishes.splice(i, 1);
        }
        if (f.x < -50) fishes.splice(i, 1);
    }

    // SPEED & SEASON CHANGE
    score += 0.2;
    speed = 3 + score / 200;

    let newSeason = Math.floor(score / 700) % 3;
    if (newSeason !== season) {
        season = newSeason;
        bgImg.src = backgrounds[season];
        loadDragon(dragonSets[season]);
        spawnPoof();
    }

    // Poof clouds for season change
    for (let i = poofCloud.length - 1; i >= 0; i--) {
        const p = poofCloud[i];
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        ctx.fillStyle = "rgba(255,255,255," + (p.life / 30) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) poofCloud.splice(i, 1);
    }

    drawUI();
    ctx.restore();

    // RED DAMAGE FLASH
    if (damageFlash > 0) {
        ctx.fillStyle = "rgba(255,0,0,0.25)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        damageFlash--;
    }

    if (health <= 0) gameState = "gameover";

    frame++;
    requestAnimationFrame(update);
}   
// ================= DRAGON TRANSFORM EFFECT =================
let poofCloud = [];

function spawnPoof() {
    for (let i = 0; i < 40; i++) {
        poofCloud.push({
            x: player.x + 60,
            y: player.y + 40,
            dx: (Math.random() - 0.5) * 6,
            dy: (Math.random() - 0.5) * 6,
            life: 30
        });
    }
}

update();
