(function () {
  function createLayer(className, zIndex) {
    var el = document.createElement("div");
    el.className = className;
    el.style.zIndex = String(zIndex);
    document.body.appendChild(el);
    return el;
  }

  function createRainCanvas() {
    var canvas = document.createElement("canvas");
    canvas.className = "rain-canvas";
    canvas.style.zIndex = "0";
    document.body.appendChild(canvas);
    return canvas;
  }

  function startRain(canvas) {
    var ctx = canvas.getContext("2d");
    var drops = [];
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var w = 0;
    var h = 0;
    var running = true;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.floor((w * h) / 12000);
      drops = Array.from({ length: count }, function () {
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          len: 8 + Math.random() * 12,
          speed: 1.4 + Math.random() * 2.4,
          alpha: 0.08 + Math.random() * 0.18,
        };
      });
    }

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        d.y += d.speed;
        d.x -= d.speed * 0.12;
        if (d.y > h + d.len || d.x < -20) {
          d.y = -20 - Math.random() * 120;
          d.x = Math.random() * (w + 80);
        }
        ctx.beginPath();
        ctx.strokeStyle = "rgba(210,225,255," + d.alpha.toFixed(3) + ")";
        ctx.lineWidth = 1;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 1.2, d.y + d.len);
        ctx.stroke();
      }
      requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    resize();
    draw();
  }

  document.addEventListener("DOMContentLoaded", function () {
    createLayer("rain-glass-layer", 2);
    createLayer("rain-drip-layer", 3);
    var canvas = createRainCanvas();
    startRain(canvas);
  });
})();

