(function () {
  'use strict';

  if (!window.IntersectionObserver) return;

  document.addEventListener('DOMContentLoaded', function () {
    var cards = document.querySelectorAll(
      '.column-main > .card, .column-main > .pagination, .column-main > .post-navigation,' +
      '.column-left > .card, .column-right-shadow > .card, .column-right > .card'
    );

    if (!cards.length) return;

    cards.forEach(function (card, i) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(28px)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      card.dataset.revealDelay = String(i * 80);
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var delay = parseInt(entry.target.dataset.revealDelay || '0', 10);
        setTimeout(function () {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'none';
        }, delay);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

    cards.forEach(function (card) { observer.observe(card); });
  });
})();
