# 实施计划：Liquid Chrome WebGL 背景效果

**日期**：2026-04-05  
**目标**：将 React/OGL 版 Liquid Chrome 组件移植为纯原生 WebGL + 原生 JS，替换现有雨滴背景动画，作为全站背景。保留现有所有卡片样式、毛玻璃效果、导航栏不变。

---

## 背景与约束

- 博客是**纯静态 HTML + 原生 JS**，无构建工具，无 npm，无 React，可修改为动态HTML
- 现有背景：`body { background: url("/img/bg.jpg") }` + `rainfx.js` 雨滴 Canvas 动画
- Liquid Chrome 原始实现依赖 React + OGL（WebGL 封装库），需完全移植为原生代码
- 9 个 HTML 文件均引用 `rainfx.js`，需统一替换
- 现有 `custom.css` 中的毛玻璃卡片、body::before 暗色蒙层等样式**保留不动**

---

## 核心原理

Liquid Chrome 的核心是一段 **GLSL Fragment Shader**，在全屏三角形上做时间驱动的正弦波扭曲叠加，产生流动的镜面金属质感。原 OGL 实现只是 WebGL 的薄封装，GLSL 代码完全可直接复用。

关键 WebGL 对象：
- `Triangle`（OGL）→ 原生实现为"大三角形"技巧：3 个顶点覆盖整个 NDC 空间
- `Program`（OGL）→ `createShader` + `createProgram` 原生 API
- `Renderer`（OGL）→ `canvas.getContext('webgl')` + `requestAnimationFrame`

---

## 文件变更清单

### 新增

| 文件 | 说明 |
|------|------|
| `js/liquidchrome.js` | 原生 WebGL 实现，完全自包含，无外部依赖 |

### 修改

| 文件 | 变更内容 |
|------|----------|
| `css/custom.css` | 删除 `body { background: url(...) }` 背景图；删除 `.rain-canvas/.rain-glass-layer/.rain-drip-layer` 相关规则；新增 `#liquidchrome-canvas` 定位样式 |
| `index.html` | 替换 `rainfx.js` → `liquidchrome.js` |
| `posts/u-claw/index.html` | 同上 |
| `posts/first-post/index.html` | 同上 |
| `categories/index.html` | 同上 |
| `categories/ai-tools/index.html` | 同上 |
| `categories/network/index.html` | 同上 |
| `archives/index.html` | 同上 |
| `about/index.html` | 同上 |
| `tags/index.html` | 同上 |

### 删除（可选，建议保留备份）

| 文件 | 说明 |
|------|------|
| `js/rainfx.js` | 雨滴动画，被 liquidchrome.js 取代 |

---

## Step 1：创建 `js/liquidchrome.js`

### 1.1 文件结构

```
(function () {
  // 1. Shader 源码（直接复用原 GLSL）
  // 2. WebGL 初始化
  // 3. 全屏三角形几何体
  // 4. 编译 Shader / 创建 Program
  // 5. 获取 uniform 位置
  // 6. Resize 处理
  // 7. 鼠标 / 触摸交互
  // 8. 动画循环（含 visibilitychange 暂停）
  // 9. DOMContentLoaded 入口
})();
```

### 1.2 配置参数（在文件顶部）

```javascript
var CONFIG = {
  baseColor:   [0.1, 0.1, 0.1],  // RGB，控制金属色调（可改为 [0.08, 0.1, 0.18] 偏蓝）
  speed:       0.2,               // 动画速度
  amplitude:   0.3,               // 波形幅度
  frequencyX:  3,                 // X 轴频率
  frequencyY:  3,                 // Y 轴频率
  interactive: true               // 是否响应鼠标
};
```

### 1.3 Vertex Shader（原版）

```glsl
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
```

### 1.4 Fragment Shader（原版，不改动）

```glsl
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform vec3 uBaseColor;
uniform float uAmplitude;
uniform float uFrequencyX;
uniform float uFrequencyY;
uniform vec2 uMouse;
varying vec2 vUv;

vec4 renderImage(vec2 uvCoord) {
    vec2 fragCoord = uvCoord * uResolution.xy;
    vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);

    for (float i = 1.0; i < 10.0; i++){
        uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
        uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
    }

    vec2 diff = (uvCoord - uMouse);
    float dist = length(diff);
    float falloff = exp(-dist * 20.0);
    float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
    uv += (diff / (dist + 0.0001)) * ripple * falloff;

    vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x));
    return vec4(color, 1.0);
}

void main() {
    vec4 col = vec4(0.0);
    int samples = 0;
    for (int i = -1; i <= 1; i++){
        for (int j = -1; j <= 1; j++){
            vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y));
            col += renderImage(vUv + offset);
            samples++;
        }
    }
    gl_FragColor = col / float(samples);
}
```

### 1.5 全屏三角形几何体（替代 OGL 的 Triangle）

OGL `Triangle` 使用"大三角形"技巧（3 个顶点，position 和 uv 如下）：

```javascript
// position buffer：覆盖整个 NDC 空间的单个三角形
var positions = new Float32Array([-1, -1,  3, -1,  -1,  3]);
// uv buffer
var uvs       = new Float32Array([ 0,  0,  2,  0,   0,  2]);
```

设置方式：
```javascript
var posBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
var posLoc = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

var uvBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
var uvLoc = gl.getAttribLocation(program, 'uv');
gl.enableVertexAttribArray(uvLoc);
gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
```

渲染调用：`gl.drawArrays(gl.TRIANGLES, 0, 3);`

### 1.6 Canvas 定位

Canvas 需要固定在视口最底层，覆盖整个屏幕：

```javascript
canvas.id = 'liquidchrome-canvas';
canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
document.body.insertBefore(canvas, document.body.firstChild);
```

> **重要**：`pointer-events:none` 确保不拦截卡片点击。使用 `insertBefore` 而非 `appendChild`，保证 canvas 在最底层 DOM 位置（z-index 配合 `position:fixed` 控制层级）。

### 1.7 Resize 处理

```javascript
function resize() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2); // 限制 DPR≤2，防止 4K 性能问题
  canvas.width  = Math.floor(window.innerWidth  * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform3f(uResolution, canvas.width, canvas.height, canvas.width / canvas.height);
}
window.addEventListener('resize', resize);
resize();
```

### 1.8 鼠标 / 触摸交互

```javascript
// 鼠标：event.clientX/Y → [0,1] 归一化，Y 轴翻转（WebGL Y 轴向上）
document.addEventListener('mousemove', function(e) {
  gl.uniform2f(uMouse, e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
});

// 触摸
document.addEventListener('touchmove', function(e) {
  if (e.touches.length > 0) {
    var t = e.touches[0];
    gl.uniform2f(uMouse, t.clientX / window.innerWidth, 1 - t.clientY / window.innerHeight);
  }
}, { passive: true });
```

> 注意：原组件用 `container` 的 rect 做坐标转换，移植到全页面时改为 `window.innerWidth/Height`。

### 1.9 动画循环（含节能）

```javascript
var running = true;
var animId;

function update(t) {
  if (!running) return;
  animId = requestAnimationFrame(update);
  gl.uniform1f(uTime, t * 0.001 * CONFIG.speed);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// 页面隐藏时暂停，节省 GPU
document.addEventListener('visibilitychange', function() {
  running = !document.hidden;
  if (running) animId = requestAnimationFrame(update);
});

animId = requestAnimationFrame(update);
```

### 1.10 WebGL 不支持时的降级

```javascript
var canvas = document.createElement('canvas');
var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
if (!gl) {
  // 降级：保留原有 bg.jpg 背景（不插入 canvas，body background 保留）
  return;
}
```

若 WebGL 不可用，函数直接返回，`body { background: url(bg.jpg) }` 作为回退（因此 CSS 删除背景图这步可改为：仅在 WebGL 可用时用 JS 动态移除 body 的 background）。

实际做法：不在 CSS 里删除 bg.jpg，而是在 JS 初始化成功后，动态设置 `document.body.style.background = 'none'`，这样降级更优雅。

---

## Step 2：修改 `css/custom.css`

### 删除以下规则

```css
/* 删除这整块 */
body {
  background: url("/img/bg.jpg") center center / cover no-repeat fixed;
}

/* 删除这整块 */
.rain-canvas,
.rain-glass-layer,
.rain-drip-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.rain-glass-layer {
  background: ...;
  mix-blend-mode: screen;
  opacity: 0.28;
}

.rain-drip-layer {
  display: none;
}
```

### 保留不动

- `body::before`（暗色蒙层，保证卡片可读性）
- `.card`（毛玻璃样式）
- 所有其他规则

### 新增（可选，用于调试）

```css
#liquidchrome-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
  pointer-events: none;
}
```

---

## Step 3：更新全部 9 个 HTML 文件

在每个文件中，找到：
```html
<script src="/js/rainfx.js" defer></script>
```

替换为：
```html
<script src="/js/liquidchrome.js" defer></script>
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

## Step 4：视觉效果调优（在 js/liquidchrome.js 顶部 CONFIG 对象修改）

| 参数 | 默认值 | 效果说明 |
|------|--------|----------|
| `baseColor` | `[0.1, 0.1, 0.1]` | 纯黑铬，偏冷。改为 `[0.08, 0.1, 0.18]` 加蓝色调，与现有深色主题更协调 |
| `speed` | `0.2` | 流动速度，建议 0.1~0.3，过高视觉疲劳 |
| `amplitude` | `0.3` | 波形幅度，越高变形越剧烈 |
| `frequencyX/Y` | `3` | 波纹密度，数值越高纹路越细密 |

**推荐初始配置**（与现有博客暗色风格协调）：
```javascript
var CONFIG = {
  baseColor:   [0.08, 0.1, 0.18],
  speed:       0.15,
  amplitude:   0.28,
  frequencyX:  3,
  frequencyY:  3,
  interactive: true
};
```

---

## Step 5：验证清单

- [ ] WebGL canvas 在 Chrome / Firefox / Safari / Edge 均正常渲染
- [ ] 鼠标移动时有涟漪效应
- [ ] 触摸设备可用
- [ ] 切换标签页后动画暂停（visibilitychange）
- [ ] 窗口 resize 后 canvas 正确填充
- [ ] 毛玻璃卡片、导航栏在效果上方正常显示
- [ ] 搜索框、返回顶部按钮正常工作
- [ ] 在不支持 WebGL 的浏览器中显示 bg.jpg 降级背景
- [ ] 9 个页面均已替换 rainfx.js → liquidchrome.js

---

## 注意事项

1. **不引入任何外部库**：OGL 和 React 均不需要，GLSL 原样使用，WebGL API 原生调用
2. **不修改 HTML 结构**：只替换一行 script 标签
3. **`defer` 属性保留**：liquidchrome.js 用 `DOMContentLoaded` 做入口，与 defer 兼容
4. **性能**：Fragment Shader 有 9 次采样（3×3 超采样）×10 次循环，中高端机流畅，低端机可将 `amplitude` 降为 0.2、去掉超采样改为单次 `renderImage(vUv)`
5. **`rainfx.js` 保留在目录中**不删除（以防回滚需要）
