(function() {
    // navbar 入场：保留
    var navbar = document.querySelector('body > .navbar');
    if (navbar) {
        navbar.style.transition = '0s';
        navbar.style.opacity = '0';
        navbar.style.transform = 'translateY(-100px)';

        document.querySelector('body > .section') && (document.querySelector('body > .section').style.opacity = '0');
        document.querySelector('body > .footer')  && (document.querySelector('body > .footer').style.opacity  = '0');

        setTimeout(function() {
            ['body > .navbar', 'body > .section', 'body > .footer'].forEach(function(sel) {
                var el = document.querySelector(sel);
                if (el) {
                    el.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                    el.style.opacity = '1';
                }
            });
            navbar.style.transform = 'translateY(0)';
        }, 0);
    }
    // 卡片入场由 scroll-reveal.js 接管，此处不处理
}());
