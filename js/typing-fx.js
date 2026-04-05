(function () {
  'use strict';

  var PHRASES = [
    '修炼中…',
    '代码即道场',
    '技术 · 思考 · 记录',
    '折腾不止，探索不停',
    '炼气第一层'
  ];
  var TYPING_SPEED  = 80;
  var ERASING_SPEED = 40;
  var PAUSE_AFTER   = 2200;

  function typePhrase(el, phrase, cb) {
    var i = 0;
    var t = setInterval(function () {
      el.textContent = phrase.slice(0, ++i) + '▌';
      if (i === phrase.length) { clearInterval(t); cb(); }
    }, TYPING_SPEED);
  }

  function erasePhrase(el, cb) {
    var text = el.textContent.replace('▌', '');
    var t = setInterval(function () {
      text = text.slice(0, -1);
      el.textContent = text + '▌';
      if (!text) { clearInterval(t); cb(); }
    }, ERASING_SPEED);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var el = document.querySelector('.card[data-type="profile"] .is-size-7.has-text-grey');
    if (!el) return;

    var idx = 0;
    el.textContent = '';

    function next() {
      typePhrase(el, PHRASES[idx], function () {
        setTimeout(function () {
          erasePhrase(el, function () {
            idx = (idx + 1) % PHRASES.length;
            setTimeout(next, 300);
          });
        }, PAUSE_AFTER);
      });
    }
    next();
  });
})();
