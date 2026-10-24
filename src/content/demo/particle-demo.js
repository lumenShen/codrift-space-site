/* particle-demo 的自有脚本：经典脚本（非模块），在 sandbox="allow-scripts" 的 srcdoc iframe 里运行 */
(function () {
  'use strict';

  var canvas = document.getElementById('stage');
  var counter = document.getElementById('counter');
  if (canvas === null) return;
  var ctx = canvas.getContext('2d');
  if (ctx === null) return;

  var particles = [];
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  }

  function spawn(x, y) {
    particles.push({
      x: x,
      y: y,
      life: 1,
      vx: (Math.random() - 0.5) * 1.6,
      vy: (Math.random() - 0.5) * 1.6,
      r: 1.5 + Math.random() * 2.5,
    });
    if (particles.length > 240) particles.splice(0, particles.length - 240);
  }

  canvas.addEventListener('pointermove', function (event) {
    var rect = canvas.getBoundingClientRect();
    spawn(event.clientX - rect.left, event.clientY - rect.top);
  });

  function tick() {
    var dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.012;
      ctx.globalAlpha = Math.max(p.life, 0) * 0.9;
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(p.x * dpr, p.y * dpr, p.r * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    particles = particles.filter(function (p) {
      return p.life > 0;
    });
    if (counter !== null) counter.textContent = 'particles: ' + particles.length;
    requestAnimationFrame(tick);
  }

  function drawStaticFallback() {
    // prefers-reduced-motion：不播动画，只铺一层静态点阵
    var dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var gx = 40; gx < canvas.width / dpr; gx += 60) {
      for (var gy = 40; gy < canvas.height / dpr; gy += 60) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(gx * dpr, gy * dpr, 2 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (counter !== null) counter.textContent = 'particles: static (reduced motion)';
  }

  window.addEventListener('resize', function () {
    resize();
    if (reducedMotion) drawStaticFallback();
  });

  resize();
  if (reducedMotion) {
    drawStaticFallback();
  } else {
    requestAnimationFrame(tick);
  }
})();
