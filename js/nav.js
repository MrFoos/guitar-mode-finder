(function () {
  var btn = document.getElementById('navToggle');
  var nav = document.querySelector('.rack-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('nav-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
})();
