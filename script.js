const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W, H, scale;

function resize() {
  scale = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = W * scale;
  canvas.height = H * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

window.addEventListener("resize", resize);
resize();

const input = {
  gas: false,
  brake: false
};

function bindButton(id, key) {
  const button = document.getElementById(id);

  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    input[key] = true;
    button.setPointerCapture(e.pointerId);
  });

  function release() {
    input[key] = false;
  }

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

bindButton("gas", "gas");
bindButton("brake", "brake");

window.addEventListener("keydown", e => {
  if (["ArrowRight", "ArrowLeft"].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    input.gas = true;
  }

  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    input.brake = true;
  }
});

window.addEventListener("keyup", e => {
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    input.gas = false;
  }

  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    input.brake = false;
  }
});

function terrainY(x) {
  return H * 0.69
    + Math.sin(x * 0.006) * 52
    + Math.sin(x * 0.014 + 1) * 26
    + Math.sin(x * 0.002) * 40
    + Math.sin(x * 0.025) * 9;
}

let car;
let camera;
let coins;
let fuelItems;
let collected;
let fuel;
let distance;
let bestX;
let gameOver;
let lastTime;

function restart() {
  car = {
    x: 100,
    y: terrainY(100) - 39,
    vx: 0,
    vy: 0,
    angle: 0,
    av: 0,
    wheel: 0
  };

  camera = 0;
  coins = [];
  fuelItems = [];
  collected = new Set();
  fuel = 100;
  distance = 0;
  bestX = 100;
  gameOver = false;
  lastTime = performance.now();

  for (let i = 0; i < 250; i++) {
    const x = 300 + i * 170;
    coins.push({
      x,
      y: terrainY(x) - 80 - Math.random() * 40
    });
  }

  for (let i = 0; i < 50; i++) {
    const x = 1100 + i * 850;
    fuelItems.push({
      x,
      y: terrainY(x) - 75,
      used: false
    });
  }

  document.getElementById("message").style.display = "none";
}

function circle(x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#38bdf8");
  sky.addColorStop(1, "#e0f2fe");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Awan
  for (let i = 0; i < 7; i++) {
    const x = (
      i * 230 - camera * 0.15
      + W + 300
    ) % (W + 300) - 80;

    const y = 65 + (i % 3) * 65;

    circle(x, y, 24, "white");
    circle(x + 25, y - 10, 30, "white");
    circle(x + 55, y, 23, "white");
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, 55, 20);
  }

  // Pegunungan
  ctx.fillStyle = "#8bb6a1";
  ctx.beginPath();
  ctx.moveTo(0, H);

  for (let x = 0; x <= W + 40; x += 40) {
    ctx.lineTo(
      x,
      H * 0.55 +
      Math.sin((x + camera * 0.12) * 0.009) * 42
    );
  }

  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function drawTerrain() {
  ctx.beginPath();
  ctx.moveTo(0, H);

  for (let x = -8; x <= W + 8; x += 8) {
    ctx.lineTo(x, terrainY(x + camera));
  }

  ctx.lineTo(W, H);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, H * 0.5, 0, H);
  grad.addColorStop(0, "#7bc043");
  grad.addColorStop(1, "#35752d");

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();

  for (let x = -8; x <= W + 8; x += 8) {
    const y = terrainY(x + camera);

    if (x === -8) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.strokeStyle = "#d9f99d";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawCar() {
  ctx.save();

  ctx.translate(car.x - camera, car.y);
  ctx.rotate(car.angle);

  // Badan mobil
  ctx.fillStyle = "#e53935";
  ctx.beginPath();
  ctx.moveTo(-34, -10);
  ctx.lineTo(-27, -25);
  ctx.lineTo(-9, -28);
  ctx.lineTo(7, -16);
  ctx.lineTo(29, -14);
  ctx.lineTo(35, -5);
  ctx.lineTo(32, 5);
  ctx.lineTo(-30, 5);
  ctx.closePath();
  ctx.fill();

  // Kaca
  ctx.fillStyle = "#b9f0ff";
  ctx.beginPath();
  ctx.moveTo(-20, -22);
  ctx.lineTo(-8, -24);
  ctx.lineTo(2, -15);
  ctx.lineTo(-23, -15);
  ctx.closePath();
  ctx.fill();

  // Lampu
  ctx.fillStyle = "#fde68a";
  ctx.fillRect(25, -9, 8, 6);

  // Roda
  for (const wx of [-22, 23]) {
    ctx.save();
    ctx.translate(wx, 5);
    ctx.rotate(car.wheel);

    circle(0, 0, 12, "#222");
    circle(0, 0, 6, "#bbb");
    circle(0, 0, 2, "#444");

    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

function drawObjects() {
  coins.forEach((c, i) => {
    if (collected.has(i)) return;

    const x = c.x - camera;

    if (x < -30 || x > W + 30) return;

    circle(x, c.y, 11, "#f59e0b");
    circle(x, c.y, 7, "#fde047");

    ctx.fillStyle = "#a16207";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("$", x, c.y + 4);
  });

  fuelItems.forEach(f => {
    if (f.used) return;

    const x = f.x - camera;

    if (x < -30 || x > W + 30) return;

    ctx.fillStyle = "#dc2626";
    ctx.fillRect(x - 11, f.y - 14, 22, 27);

    ctx.fillStyle = "white";
    ctx.fillRect(x - 4, f.y - 9, 8, 13);

    ctx.fillStyle = "#dc2626";
    ctx.fillRect(x - 5, f.y - 19, 10, 6);

    ctx.fillStyle = "white";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("F", x, f.y + 22);
  });
}

function update(dt) {
  if (gameOver) return;

  const gravity = 1000;

  if (fuel > 0) {
    if (input.gas) {
      car.vx += 650 * dt;
      fuel -= 2.2 * dt;
    }

    if (input.brake) {
      car.vx -= 450 * dt;
      fuel -= 2.2 * dt;
    }
  }

  car.vx *= Math.pow(0.992, dt * 60);
  car.vx = Math.max(-230, Math.min(430, car.vx));

  car.x += car.vx * dt;
  car.vy += gravity * dt;
  car.y += car.vy * dt;

  const frontY = terrainY(car.x + 23);
  const rearY = terrainY(car.x - 23);
  const groundAngle = Math.atan2(frontY - rearY, 46);

  const ground = terrainY(car.x) - 39;

  if (car.y >= ground) {
    car.y = ground;
    car.vy = Math.min(0, car.vy);

    car.angle +=
      (groundAngle - car.angle) * Math.min(1, dt * 9);

    car.av = 0;
    car.wheel += car.vx * dt / 12;
  } else {
    if (input.gas) car.av += 1.9 * dt;
    if (input.brake) car.av -= 1.9 * dt;

    car.av *= 0.99;
    car.angle += car.av * dt;
  }

  car.angle = Math.atan2(
    Math.sin(car.angle),
    Math.cos(car.angle)
  );

  camera = Math.max(0, car.x - W * 0.3);
  bestX = Math.max(bestX, car.x);
  distance = Math.floor((bestX - 100) / 10);

  // Mengambil koin
  coins.forEach((c, i) => {
    if (collected.has(i)) return;

    if (Math.hypot(car.x - c.x, car.y - c.y) < 37) {
      collected.add(i);
    }
  });

  // Mengambil bahan bakar
  fuelItems.forEach(f => {
    if (
      !f.used &&
      Math.abs(car.x - f.x) < 38 &&
      Math.abs(car.y - f.y) < 50
    ) {
      f.used = true;
      fuel = Math.min(100, fuel + 35);
    }
  });

  document.getElementById("coins").textContent =
    collected.size;

  document.getElementById("distance").textContent =
    Math.max(0, distance);

  document.getElementById("fuelText").textContent =
    Math.max(0, Math.ceil(fuel)) + "%";

  document.getElementById("fuelBar").style.width =
    Math.max(0, fuel) + "%";

  document.getElementById("fuelBar").style.background =
    fuel < 25 ? "#ef4444" :
    fuel < 50 ? "#facc15" : "#4ade80";

  if (
    fuel <= 0 ||
    car.y > H + 150 ||
    (Math.abs(car.angle) > 2.5 && Math.abs(car.vx) < 20)
  ) {
    endGame();
  }
}

function endGame() {
  gameOver = true;

  document.getElementById("endTitle").textContent =
    fuel <= 0 ? "⛽ BBM Habis!" : "💥 Game Over!";

  document.getElementById("endInfo").textContent =
    "Jarak: " + Math.max(0, distance) +
    " m | Koin: " + collected.size;

  document.getElementById("message").style.display = "flex";
}

function draw() {
  drawBackground();
  drawTerrain();
  drawObjects();
  drawCar();
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.03);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

restart();
requestAnimationFrame(loop);