(function () {
  'use strict';

  // 触摸设备不启用自定义光标
  if (window.matchMedia('(pointer: coarse)').matches) return;

  var dot  = document.createElement('div');
  var ring = document.createElement('div');
  dot.id  = 'cursor-dot';
  ring.id = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.body.classList.add('has-custom-cursor');

  var mx = window.innerWidth  / 2;
  var my = window.innerHeight / 2;
  var rx = mx, ry = my;
  var rafId;

  // 使用 transform 而非 left/top，GPU 加速
  function setPos(el, x, y) {
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
  }

  document.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
    setPos(dot, mx, my);
  });

  // Ring 使用 lerp 平滑追踪
  var LERP = 0.18;
  function animate() {
    rx += (mx - rx) * LERP;
    ry += (my - ry) * LERP;
    setPos(ring, rx, ry);
    rafId = requestAnimationFrame(animate);
  }
  rafId = requestAnimationFrame(animate);

  // 悬停可交互元素时改变形态
  var HOVER_SELECTORS = '.card, a, button, [role="button"], input, label, select, textarea';

  document.addEventListener('mouseover', function (e) {
    if (e.target.closest(HOVER_SELECTORS)) {
      document.body.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(HOVER_SELECTORS)) {
      document.body.classList.remove('cursor-hover');
    }
  });

  // 点击弹动反馈
  document.addEventListener('mousedown', function () {
    ring.style.transform = 'translate(-50%, -50%) scale(0.82)';
  });
  document.addEventListener('mouseup', function () {
    ring.style.transform = 'translate(-50%, -50%) scale(1)';
  });

  // 页面失焦时暂停 rAF
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      rafId = requestAnimationFrame(animate);
    }
  });
})();
