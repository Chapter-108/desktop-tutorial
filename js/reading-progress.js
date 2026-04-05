(function () {
  'use strict';

  if (!location.pathname.includes('/posts/')) return;

  var bar = document.createElement('div');
  bar.id = 'reading-progress';
  document.body.appendChild(bar);

  window.addEventListener('scroll', function () {
    var doc     = document.documentElement;
    var scrolled = doc.scrollTop || document.body.scrollTop;
    var total    = doc.scrollHeight - doc.clientHeight;
    bar.style.width = (total > 0 ? (scrolled / total * 100) : 0) + '%';
  }, { passive: true });
})();
