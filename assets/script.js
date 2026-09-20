/* ============================================================
   MIP 的朋友圈 · 交互脚本
   ============================================================ */
(function () {
  "use strict";

  var SELF_WXID = "wxid_7u0m3mymxh3u22";
  var data = (typeof window.MOMENTS_DATA !== "undefined") ? window.MOMENTS_DATA : [];

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function fmtDate(d) {
    var parts = String(d).split("-");
    if (parts.length === 3) return parseInt(parts[0], 10) + "年" + parseInt(parts[1], 10) + "月" + parseInt(parts[2], 10) + "日";
    return d;
  }

  function prettyName(name) {
    return name === SELF_WXID ? "我" : name;
  }

  function renderPost(post) {
    var card = el("article", "post");
    var head = el("div", "post-head");
    head.appendChild(el("span", "post-date", fmtDate(post.date)));
    head.appendChild(el("span", "post-time", post.time));
    card.appendChild(head);
    if (post.text) card.appendChild(el("div", "post-text", escapeHtml(post.text)));
    var imgs = post.images || [];
    if (imgs.length) {
      var wrap = el("div", "post-images count-" + imgs.length);
      imgs.forEach(function (src) {
        var img = el("img", "", "");
        img.src = src;
        img.alt = post.date + " 照片";
        img.loading = "lazy";
        img.addEventListener("click", function () { openViewer(src); });
        wrap.appendChild(img);
      });
      card.appendChild(wrap);
    }
    if (post.link_url) {
      var a = el("a", "post-link", "");
      a.href = post.link_url;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = '<span class="link-song">🎵 ' + escapeHtml(post.link_title || "分享的音乐") + '</span><span class="link-tag">点开听一听她分享的歌</span>';
      card.appendChild(a);
    }
    if (post.likes && post.likes.length) {
      var shown = post.likes.map(prettyName);
      var inner = shown.length > 9 ? shown.slice(0, 7).join("、") + " 等 " + shown.length + " 人" : shown.join("、");
      card.appendChild(el("div", "post-likes", '<span class="heart">❤️</span><span class="liker">' + escapeHtml(inner) + "</span>"));
    }
    if (post.comments && post.comments.length) {
      var cwrap = el("div", "post-comments");
      post.comments.forEach(function (line) {
        var idx = line.indexOf("：");
        if (idx === -1) idx = line.indexOf(":");
        var name = "", text = line;
        if (idx > -1) { name = line.slice(0, idx); text = line.slice(idx + 1); }
        var row = el("div", "comment");
        if (name) row.appendChild(el("span", "c-name", escapeHtml(prettyName(name))));
        row.appendChild(el("span", "c-text", escapeHtml(text)));
        cwrap.appendChild(row);
      });
      card.appendChild(cwrap);
    }
    return card;
  }

  var host = document.getElementById("posts");
  if (host && data.length) data.forEach(function (post) { host.appendChild(renderPost(post)); });

  /* ---------- 图片查看器 ---------- */
  var viewer = document.getElementById("viewer");
  var viewerImg = null;
  if (viewer) {
    viewerImg = el("img", "", "");
    viewer.appendChild(viewerImg);
    viewer.addEventListener("click", function () {
      viewer.classList.remove("open");
      if (viewerImg) viewerImg.src = "";
    });
  }
  function openViewer(src) {
    if (!viewer || !viewerImg) return;
    viewerImg.src = src;
    viewer.classList.add("open");
  }

  /* ---------- 统计数字动画 ---------- */
  function animateCount(node) {
    var target = parseInt(node.getAttribute("data-count"), 10) || 0;
    var start = null, dur = 900;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      node.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var stats = document.getElementById("stats");
  if (stats && "IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll(".num").forEach(animateCount);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    obs.observe(stats);
  } else if (stats) {
    stats.querySelectorAll(".num").forEach(function (n) { n.textContent = n.getAttribute("data-count"); });
  }

  /* ---------- 生日页触发 + 烟花 ---------- */
  var birthday = document.getElementById("birthday");
  var canvas = document.getElementById("fireworks");
  var fwCtx = null, particles = [], running = false, rafId = null, lastBurst = 0;
  var THEME = ["#FFD76F", "#E9A0D0", "#A78BFA", "#7EB8E8", "#FF9F45", "#FFE9A8"];

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * Math.min(window.devicePixelRatio || 1, 2);
    canvas.height = canvas.offsetHeight * Math.min(window.devicePixelRatio || 1, 2);
  }

  function burst(x, y) {
    var count = 70 + Math.floor(Math.random() * 40);
    var color = THEME[Math.floor(Math.random() * THEME.length)];
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1.5 + Math.random() * 3.4;
      particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, decay: 0.008 + Math.random() * 0.012, size: 1.2 + Math.random() * 2.2, color: color });
    }
    if (particles.length > 700) particles.splice(0, particles.length - 700);
  }

  function loop(ts) {
    if (!running) return;
    fwCtx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.045;
      p.vx *= 0.985;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      fwCtx.globalAlpha = Math.max(p.life, 0);
      fwCtx.fillStyle = p.color;
      fwCtx.beginPath();
      fwCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      fwCtx.fill();
    }
    fwCtx.globalAlpha = 1;
    if (ts - lastBurst > 700 + Math.random() * 900) {
      var w = canvas.width, h = canvas.height;
      burst(Math.random() * w * 0.6 + w * 0.2, Math.random() * h * 0.45 + h * 0.12);
      if (Math.random() < 0.45) burst(Math.random() * w, Math.random() * h * 0.4 + h * 0.15);
      lastBurst = ts;
    }
    rafId = requestAnimationFrame(loop);
  }

  function startParty() {
    if (running || !canvas) return;
    fwCtx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    running = true;
    rafId = requestAnimationFrame(loop);
  }

  if (birthday) {
    if ("IntersectionObserver" in window) {
      var bobs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            birthday.classList.add("active");
            startParty();
            bobs.unobserve(birthday);
          }
        });
      }, { threshold: 0.3 });
      bobs.observe(birthday);
    } else {
      birthday.classList.add("active");
      startParty();
    }
  }

  /* ================= BFF 页 ================= */
  var bff = document.getElementById("bff");
  var sc = document.getElementById("sparkles");
  var polaroid = document.getElementById("polaroid");
  var glow = bff ? bff.querySelector(".bff-glow") : null;
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 标题逐字拆分 */
  var titleEl = document.getElementById("bffTitle");
  if (titleEl) {
    var tText = titleEl.textContent;
    titleEl.textContent = "";
    tText.split("").forEach(function (ch, i) {
      var s = el("span", "ch", ch === " " ? "\u00A0" : ch);
      s.style.transitionDelay = (0.25 + i * 0.045) + "s";
      titleEl.appendChild(s);
    });
  }

  /* 光尘粒子 */
  var sCtx = null, sparks = [], sRaf = null, sRunning = false;
  var SPARK_COLORS = ["#FFE9A8", "#F5B301", "#E9A0D0", "#A78BFA", "#7EB8E8"];

  function sResize() {
    if (!sc) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    sc.width = sc.offsetWidth * dpr;
    sc.height = sc.offsetHeight * dpr;
    sCtx = sc.getContext("2d");
    sCtx.scale(dpr, dpr);
  }

  function spawnSpark(n) {
    if (!sc) return;
    for (var i = 0; i < n; i++) {
      sparks.push({
        x: Math.random() * sc.width,
        y: sc.height + 12 + Math.random() * 40,
        r: 0.6 + Math.random() * 1.9,
        vy: -(0.25 + Math.random() * 0.65),
        vx: (Math.random() - 0.5) * 0.22,
        life: 1,
        decay: 0.0016 + Math.random() * 0.0026,
        color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
        tw: Math.random() * Math.PI * 2
      });
    }
    if (sparks.length > 260) sparks.splice(0, sparks.length - 260);
  }

  function hearts(x, y, count) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 1.2 + Math.random() * 3.4;
      sparks.push({
        x: x, y: y, r: 6 + Math.random() * 8,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.6,
        life: 1, decay: 0.012 + Math.random() * 0.014,
        color: "#FF8FB4", heart: true, tw: 0
      });
    }
  }

  function sLoop() {
    if (!sRunning || !sCtx || !sc) return;
    sCtx.clearRect(0, 0, sc.width, sc.height);
    for (var i = sparks.length - 1; i >= 0; i--) {
      var p = sparks[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += p.heart ? 0.05 : 0;
      p.life -= p.decay;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      sCtx.globalAlpha = Math.max(Math.min(p.life * 1.4, 0.9), 0);
      sCtx.fillStyle = p.color;
      if (p.heart) {
        sCtx.save();
        sCtx.translate(p.x, p.y);
        sCtx.scale(p.r * p.life / 7, p.r * p.life / 7);
        sCtx.font = "14px sans-serif";
        sCtx.textAlign = "center"; sCtx.textBaseline = "middle";
        sCtx.fillText("♥", 0, 0);
        sCtx.restore();
      } else {
        p.tw += 0.06;
        var rr = p.r * (0.7 + 0.3 * Math.sin(p.tw));
        sCtx.beginPath();
        sCtx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        sCtx.fill();
      }
    }
    sCtx.globalAlpha = 1;
    sRaf = requestAnimationFrame(sLoop);
  }

  function startSparkles() {
    if (sRunning || !sc || reducedMotion) return;
    sResize();
    window.addEventListener("resize", sResize);
    spawnSpark(36);
    sRunning = true;
    sRaf = requestAnimationFrame(sLoop);
  }

  function sparkBurst(e) {
    if (!sc || !sCtx) return;
    var r = sc.getBoundingClientRect();
    hearts(e.clientX - r.left, e.clientY - r.top, 14);
  }

  /* BFF 入场触发 */
  if (bff) {
    if ("IntersectionObserver" in window) {
      var fobs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            bff.classList.add("enter");
            startSparkles();
            fobs.unobserve(bff);
          }
        });
      }, { threshold: 0.25 });
      fobs.observe(bff);
    } else {
      bff.classList.add("enter");
      startSparkles();
    }
  }

  /* 鼠标视差（入场落定后启用） */
  var parallaxOn = false;
  if (bff && polaroid && !reducedMotion && window.matchMedia("(hover: hover)").matches) {
    bff.addEventListener("mousemove", function (e) {
      if (!parallaxOn) return;
      var r = bff.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      polaroid.style.transform = "translate(" + (dx * 14) + "px," + (dy * 10) + "px) rotate(-2.5deg)";
      if (glow) glow.style.transform = "translate(calc(-50% + " + (-dx * 30) + "px), calc(-50% + " + (-dy * 20) + "px))";
    });
    bff.addEventListener("mouseleave", function () {
      if (!parallaxOn) return;
      polaroid.style.transform = "rotate(-2.5deg)";
      if (glow) glow.style.transform = "";
    });
  }
  if (polaroid) {
    polaroid.addEventListener("transitionend", function (ev) {
      if (ev.propertyName === "transform" && bff && bff.classList.contains("enter")) parallaxOn = true;
    });
    /* 点击迸发小心心 */
    polaroid.addEventListener("click", function (e) {
      if (reducedMotion) return;
      sparkBurst(e);
      polaroid.classList.remove("clicked");
      void polaroid.offsetWidth;
      polaroid.classList.add("clicked");
    });
  }
})();