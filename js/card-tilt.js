(function () {
  'use strict';

  // 触摸设备跳过
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.addEventListener('DOMContentLoaded', function () {
    var cards = document.querySelectorAll('.card');

    cards.forEach(function (card) {
      var rafId;
      var pendingX = 0, pendingY = 0, hasPending = false;

      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        pendingX = (e.clientX - rect.left) / rect.width  - 0.5;
        pendingY = (e.clientY - rect.top)  / rect.height - 0.5;
        if (!hasPending) {
          hasPending = true;
          rafId = requestAnimationFrame(function () {
            var rotX = -pendingY * 10;
            var rotY =  pendingX * 10;
            card.style.transform =
              'perspective(900px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateZ(8px) scale(1.01)';
            card.style.setProperty('--tilt-x', (50 + pendingX * 80) + '%');
            card.style.setProperty('--tilt-y', (50 + pendingY * 80) + '%');
            hasPending = false;
          });
        }
      });

      card.addEventListener('mouseleave', function () {
        cancelAnimationFrame(rafId);
        hasPending = false;
        card.style.transform = '';
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
      });
    });
  });
})();
