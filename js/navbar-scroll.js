(function () {
  'use strict';

  var navbar = document.querySelector('.navbar-main');
  if (!navbar) return;

  var THRESHOLD = 60;
  var ticking = false;

  function update() {
    var scrolled = window.scrollY || document.documentElement.scrollTop;
    if (scrolled > THRESHOLD) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
})();
