# 实施计划：UI 全套灵动性增强

**日期**：2026-04-05  
**目标**：在现有深色毛玻璃博客风格基础上，叠加 7 个动态交互层（A–G），不破坏现有布局和样式，全部使用原生 JS + CSS，无外部依赖。

---

## 模块总览

| 模块 | 文件 | 类型 | 作用域 |
|------|------|------|--------|
| A · 自定义光标 + 光晕 | `js/cursor-fx.js` | 新建 JS | 全站（桌面端） |
| B · 卡片滚动入场 | `js/scroll-reveal.js` | 新建 JS（替代 animation.js） | 全站 |
| C · 卡片 3D 倾斜 | `js/card-tilt.js` | 新建 JS | 全站 |
| D · 动态渐变边框 | `css/custom.css` 追加 | 纯 CSS | 全站 |
| E · 侧栏打字机 | `js/typing-fx.js` | 新建 JS | 全站（有侧栏的页面） |
| F · 阅读进度条 | `js/reading-progress.js` | 新建 JS | 仅文章页 `/posts/` |
| G · 导航栏滚动收缩 | `js/navbar-scroll.js` | 新建 JS | 全站 |

**HTML 变更**：9 个页面均需在 `</body>` 前追加新 script 标签（替换 `rainfx.js` → `liquidchrome.js` 已在上一份计划中处理）。

---

## 模块 A：自定义光标 + 光晕跟随

### 新建 `js/cursor-fx.js`

**逻辑：**
1. 检测是否为触摸设备 `window.matchMedia('(pointer: coarse)')` → 是则直接 return，不执行任何操作，保持原生光标
2. 注入两个固定定位元素到 `<body>`：
   - `#cursor-dot`：8px 白色实心圆，即时跟随，`z-index: 9999`
   - `#cursor-ring`：32px 空心圆（border），用 CSS `transition: transform 0.12s ease` 延迟跟随，`z-index: 9998`
3. `mousemove` 更新坐标，ring 用 `requestAnimationFrame` + lerp 平滑插值
4. 悬停在 `.card, a, button, [role="button"]` 时：dot 缩小至 4px，ring 放大至 56px + 颜色变为 `rgba(200,210,255,0.6)`，过渡 0.2s
5. 点击时：ring 短暂缩小 → `scale(0.85)` → 恢复，模拟按压反弹

**CSS（注入或写入 custom.css）：**
```css
body.has-custom-cursor * { cursor: none !important; }

#cursor-dot {
  position: fixed; pointer-events: none; z-index: 9999;
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(220, 228, 255, 0.95);
  box-shadow: 0 0 10px rgba(180, 200, 255, 0.8), 0 0 20px rgba(160, 185, 255, 0.4);
  transform: translate(-50%, -50%);
  transition: width 0.2s, height 0.2s, background 0.2s;
  will-change: transform;
}

#cursor-ring {
  position: fixed; pointer-events: none; z-index: 9998;
  width: 32px; height: 32px; border-radius: 50%;
  border: 1.5px solid rgba(200, 215, 255, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.2s ease, height 0.2s ease,
              border-color 0.2s ease, transform 0.08s linear;
  will-change: transform;
}

/* 悬停在可交互元素上 */
body.cursor-hover #cursor-dot {
  width: 4px; height: 4px;
}
body.cursor-hover #cursor-ring {
  width: 56px; height: 56px;
  border-color: rgba(180, 200, 255, 0.7);
  background: rgba(180, 200, 255, 0.05);
}
```

---

## 模块 B：卡片滚动入场动画

### 新建 `js/scroll-reveal.js`（替代 `animation.js` 的入场逻辑）

**策略：**
- 保留 `animation.js` 的 navbar 下滑入场（只去掉卡片部分的 setTimeout 批量逻辑）
- 用 `IntersectionObserver` 重写卡片入场：各卡片独立触发，有节奏感

**初始状态（由 JS 在 DOMContentLoaded 后注入，不写死 CSS 防止 JS 禁用时内容消失）：**
```javascript
// 初始化：给每张卡片加初始隐藏状态
document.querySelectorAll('.column-main > .card, .column-left > .card, .column-right > .card')
  .forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(28px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    card.dataset.revealDelay = String(i * 80); // 每张错开 80ms
  });
```

**Observer：**
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.revealDelay || '0');
      setTimeout(() => {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'none';
      }, delay);
      observer.unobserve(entry.target); // 触发一次即停止观察
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
```

**与 animation.js 的协作：**
- `animation.js` 保留 navbar 的 `translateY(-100px)` → `translateY(0)` 入场
- `animation.js` 里卡片相关的 `setTimeout` 块删除（由 scroll-reveal.js 接管）
- 如果不想修改 animation.js，可在 scroll-reveal.js 里覆盖：入场 observer 回调先于 animation.js 的 timeout 完成

---

## 模块 C：卡片 3D 磁力倾斜

### 新建 `js/card-tilt.js`

**核心算法：**
```javascript
card.addEventListener('mousemove', (e) => {
  const rect = card.getBoundingClientRect();
  // 归一化鼠标位置：-0.5 ~ 0.5
  const x = (e.clientX - rect.left) / rect.width  - 0.5;
  const y = (e.clientY - rect.top)  / rect.height - 0.5;
  // rotateY 跟随 x，rotateX 跟随 y（注意符号）
  const rotX = -y * 10; // max ±5° (half of 10)
  const rotY =  x * 10;
  card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(4px)`;
  // 高光：根据鼠标位置移动反光渐变
  card.style.setProperty('--tilt-x', `${50 + x * 80}%`);
  card.style.setProperty('--tilt-y', `${50 + y * 80}%`);
});

card.addEventListener('mouseleave', () => {
  card.style.transform = '';
  card.style.removeProperty('--tilt-x');
  card.style.removeProperty('--tilt-y');
});
```

**CSS 配合（追加至 custom.css）：**
```css
.card {
  transform-style: preserve-3d;
  /* 已有 transition，确保包含 transform */
  transition: transform 0.25s ease, box-shadow 0.25s ease,
              border-color 0.25s ease, background-color 0.25s ease;
}

/* 高光反射层（伪元素） */
.card::after {
  content: '';
  position: absolute; inset: 0; border-radius: inherit;
  background: radial-gradient(
    circle at var(--tilt-x, 50%) var(--tilt-y, 50%),
    rgba(255,255,255,0.08) 0%,
    transparent 60%
  );
  pointer-events: none;
  transition: opacity 0.3s;
  opacity: 0;
}
.card:hover::after { opacity: 1; }
```

**注意：** 3D 倾斜会覆盖 custom.css 里已有的 `.card:hover { transform: translateY(-6px) scale(1.01) }`，需在 card-tilt.js 中检测：若已有 mousemove 倾斜，则跳过 CSS hover 的 transform（在 mousemove 监听器内同时处理 scale）：
```javascript
// 在 mousemove 内合并
card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(8px) scale(1.01)`;
```
同时在 custom.css 中注释掉 `.card:hover { transform: ... }` 那行，改由 JS 控制。

---

## 模块 D：动态渐变边框 + 光扫效果

### 仅修改 `css/custom.css`

**技术：** 在卡片 `::before` 上用旋转的 `conic-gradient` 做边框，卡片本身用 `overflow: visible` + `position: relative`。光扫（shimmer）用 `::after` 伪元素平移实现。

```css
/* ---- 卡片光扫动画 ---- */
@keyframes shimmer-slide {
  from { transform: translateX(-100%) skewX(-15deg); }
  to   { transform: translateX(250%)  skewX(-15deg); }
}

.card {
  position: relative;
  overflow: hidden; /* 已有，确认保留 */
}

/* 悬停时触发光扫 */
.card:hover::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.06) 40%,
    rgba(255,255,255,0.12) 50%,
    rgba(255,255,255,0.06) 60%,
    transparent 100%
  );
  width: 60%;
  pointer-events: none;
  z-index: 2;
  animation: shimmer-slide 0.65s ease forwards;
}
```

**渐变边框（持续旋转，仅首页文章卡片）：**
```css
@property --border-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes border-rotate {
  to { --border-angle: 360deg; }
}

/* 仅文章卡片（首页） */
.column-main > .card {
  background: conic-gradient(
    from var(--border-angle),
    rgba(255,255,255,0.0) 80%,
    rgba(180,200,255,0.35) 88%,
    rgba(255,255,255,0.0) 92%
  ) border-box !important;
  /* 注意：需配合 border: 1px solid transparent */
  animation: border-rotate 6s linear infinite;
}
```

> **降级**：`@property` 在旧浏览器不支持，降级为静态边框（已有 rgba white border），不影响功能。

---

## 模块 E：侧栏打字机效果

### 新建 `js/typing-fx.js`

**目标元素：** `.card[data-type="profile"] .is-size-7.has-text-grey`（内容为"简介：暂无"）

**配置（文件顶部）：**
```javascript
var TYPING_PHRASES = [
  '修炼中…',
  '代码即道场',
  '技术 · 思考 · 记录',
  '折腾不止，探索不停',
  '炼气第一层'
];
var TYPING_SPEED  = 80;   // ms/字
var ERASING_SPEED = 40;   // ms/字
var PAUSE_AFTER   = 2200; // 打完后停留
```

**核心循环：**
```javascript
// 打字 → 停顿 → 删除 → 切换下一条 → 循环
function typePhrase(el, phrase, cb) {
  let i = 0;
  const t = setInterval(() => {
    el.textContent = phrase.slice(0, ++i) + '▌'; // 光标符
    if (i === phrase.length) { clearInterval(t); cb(); }
  }, TYPING_SPEED);
}

function erasePhrase(el, cb) {
  let text = el.textContent.replace('▌', '');
  const t = setInterval(() => {
    text = text.slice(0, -1);
    el.textContent = text + '▌';
    if (!text) { clearInterval(t); cb(); }
  }, ERASING_SPEED);
}
```

**初始化：**
```javascript
document.addEventListener('DOMContentLoaded', () => {
  const el = document.querySelector('.card[data-type="profile"] .is-size-7.has-text-grey');
  if (!el) return; // 非侧栏页面直接退出
  // 去掉原有文字，开始循环
  let idx = 0;
  function next() {
    typePhrase(el, TYPING_PHRASES[idx], () => {
      setTimeout(() => erasePhrase(el, () => {
        idx = (idx + 1) % TYPING_PHRASES.length;
        setTimeout(next, 300);
      }), PAUSE_AFTER);
    });
  }
  el.textContent = '';
  next();
});
```

**CSS（追加至 custom.css）：**
```css
/* 打字光标闪烁 */
@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
/* 光标字符 ▌ 的动画由 JS 控制插入，CSS 做视觉增强 */
.card[data-type="profile"] .is-size-7 {
  font-variant-numeric: tabular-nums;
  min-height: 1.4em; /* 防止文字消失时布局跳动 */
}
```

---

## 模块 F：文章阅读进度条

### 新建 `js/reading-progress.js`

**激活条件：** URL 包含 `/posts/`，否则直接 return

```javascript
if (!location.pathname.includes('/posts/')) return;
```

**注入元素：**
```javascript
var bar = document.createElement('div');
bar.id = 'reading-progress';
document.body.appendChild(bar);
```

**进度计算（scroll 事件）：**
```javascript
window.addEventListener('scroll', function() {
  var doc    = document.documentElement;
  var scrolled = doc.scrollTop || document.body.scrollTop;
  var total    = doc.scrollHeight - doc.clientHeight;
  var pct = total > 0 ? (scrolled / total * 100) : 0;
  bar.style.width = pct + '%';
}, { passive: true });
```

**CSS（追加至 custom.css）：**
```css
#reading-progress {
  position: fixed;
  top: 0; left: 0;
  height: 3px;
  width: 0%;
  z-index: 10000;
  background: linear-gradient(
    90deg,
    rgba(160, 185, 220, 0.6) 0%,
    rgba(220, 230, 255, 0.95) 50%,
    rgba(180, 200, 240, 0.7) 100%
  );
  box-shadow: 0 0 8px rgba(200, 220, 255, 0.6);
  transition: width 0.1s linear;
  pointer-events: none;
}
```

---

## 模块 G：导航栏滚动收缩 + 毛玻璃加深

### 新建 `js/navbar-scroll.js`

```javascript
(function () {
  var navbar = document.querySelector('.navbar-main');
  if (!navbar) return;

  var THRESHOLD = 60; // px，超过后触发
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
```

**CSS（追加至 custom.css）：**
```css
.navbar-main {
  transition: background 0.35s ease, backdrop-filter 0.35s ease,
              box-shadow 0.35s ease, padding 0.35s ease;
}

.navbar-main .container {
  transition: margin-top 0.35s ease, padding 0.35s ease;
}

.navbar-main.navbar-scrolled .container {
  margin-top: 6px !important;   /* 原来 14px */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(8, 12, 28, 0.72) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4) !important;
  border-radius: 14px !important;
}
```

---

## 文件变更汇总

### 新增 JS（6 个）

```
js/cursor-fx.js
js/scroll-reveal.js
js/card-tilt.js
js/typing-fx.js
js/reading-progress.js
js/navbar-scroll.js
```

### 修改文件（2 个）

| 文件 | 变更 |
|------|------|
| `css/custom.css` | 追加模块 A/C/D/E/F/G 的 CSS |
| `js/animation.js` | 删除卡片 setTimeout 入场块（约第 29–43 行），保留 navbar 入场 |

### 更新 HTML（9 个页面）

在每个 HTML 文件的 `</body>` 前，现有脚本块之后追加：

```html
<script src="/js/cursor-fx.js" defer></script>
<script src="/js/scroll-reveal.js" defer></script>
<script src="/js/card-tilt.js" defer></script>
<script src="/js/typing-fx.js" defer></script>
<script src="/js/reading-progress.js" defer></script>
<script src="/js/navbar-scroll.js" defer></script>
```

涉及文件：
1. `index.html`
2. `posts/u-claw/index.html`
3. `posts/first-post/index.html`
4. `categories/index.html`
5. `categories/ai-tools/index.html`
6. `categories/network/index.html`
7. `archives/index.html`
8. `about/index.html`
9. `tags/index.html`

---

## 执行顺序建议

```
Step 1  修改 css/custom.css（追加所有新 CSS）
Step 2  修改 js/animation.js（删除卡片入场块）
Step 3  创建 js/scroll-reveal.js
Step 4  创建 js/navbar-scroll.js
Step 5  创建 js/cursor-fx.js
Step 6  创建 js/card-tilt.js
Step 7  创建 js/typing-fx.js
Step 8  创建 js/reading-progress.js
Step 9  更新 9 个 HTML 文件（统一追加 6 行 script）
Step 10 验证
```

---

## 验证清单

- [ ] **A** 桌面端自定义光标显示，悬停卡片/链接时光圈变大变色，点击有弹动
- [ ] **A** 移动端/触摸设备恢复原生光标，无异常
- [ ] **B** 页面滚动时卡片从下方淡入，有节奏感错开，不同时出现
- [ ] **B** 页面初次加载时视口内已有卡片立即入场（不需要滚动）
- [ ] **C** 鼠标悬停卡片时有 3D 倾斜，移开后复位
- [ ] **C** 倾斜高光反光层与鼠标位置对应
- [ ] **D** 卡片悬停时有光扫过动画（shimmer）
- [ ] **D** 渐变边框在支持 `@property` 的浏览器中流动，旧浏览器降级静态边框
- [ ] **E** 侧栏个人信息区打字动画循环运行，有光标闪烁
- [ ] **E** 无侧栏页面（不含 profile card）不报错
- [ ] **F** 仅文章页（`/posts/`）顶部出现进度条
- [ ] **F** 滚动到底部进度条为 100%，返回顶部归零
- [ ] **G** 向下滚动超过 60px 后导航栏收缩 + 毛玻璃加深
- [ ] **G** 回到顶部导航栏恢复原始样式
- [ ] 所有模块不影响搜索框、返回顶部按钮正常工作
- [ ] 所有模块不影响 Liquid Chrome WebGL 背景渲染

---

## 注意事项

1. **执行优先级**：Step 1（CSS）→ Step 2（animation.js）→ 其余 JS → HTML，避免临时样式闪烁
2. **card-tilt.js 与现有 CSS hover**：`js/card-tilt.js` 接管 `.card:hover { transform }` 后，需在 `custom.css` 中注释该行；或在 tilt 脚本里对 scale 做合并处理
3. **scroll-reveal.js 与 animation.js 的边界**：animation.js 第 5–21 行的 navbar 入场保留；第 23–44 行的卡片初始化（`opacity:0, scale:0.8`）和 setTimeout 循环删除，由 scroll-reveal.js 全部接管
4. **`@property` CSS Houdini**：渐变边框动画在 Safari 15.4+、Chrome 85+、Edge 85+ 支持；Firefox 暂不支持，降级为静态边框，无功能损失
5. **性能**：全部模块均使用 `will-change`、`passive` 事件、`requestAnimationFrame` 节流，确保不阻塞主线程
