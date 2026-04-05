(function () {
  'use strict';

  var CONFIG = {
    baseColor:   [0.08, 0.1, 0.18],
    speed:       0.15,
    amplitude:   0.28,
    frequencyX:  3,
    frequencyY:  3,
    interactive: true
  };

  var VERT_SRC = [
    'attribute vec2 position;',
    'attribute vec2 uv;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = vec4(position, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG_SRC = [
    'precision highp float;',
    'uniform float uTime;',
    'uniform vec3 uResolution;',
    'uniform vec3 uBaseColor;',
    'uniform float uAmplitude;',
    'uniform float uFrequencyX;',
    'uniform float uFrequencyY;',
    'uniform vec2 uMouse;',
    'varying vec2 vUv;',

    'vec4 renderImage(vec2 uvCoord) {',
    '    vec2 fragCoord = uvCoord * uResolution.xy;',
    '    vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);',

    '    for (float i = 1.0; i < 10.0; i++){',
    '        uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);',
    '        uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);',
    '    }',

    '    vec2 diff = (uvCoord - uMouse);',
    '    float dist = length(diff);',
    '    float falloff = exp(-dist * 20.0);',
    '    float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;',
    '    uv += (diff / (dist + 0.0001)) * ripple * falloff;',

    '    vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x));',
    '    return vec4(color, 1.0);',
    '}',

    'void main() {',
    '    vec4 col = vec4(0.0);',
    '    int samples = 0;',
    '    for (int i = -1; i <= 1; i++){',
    '        for (int j = -1; j <= 1; j++){',
    '            vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y));',
    '            col += renderImage(vUv + offset);',
    '            samples++;',
    '        }',
    '    }',
    '    gl_FragColor = col / float(samples);',
    '}'
  ].join('\n');

  function compileShader(gl, type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vertSrc, fragSrc) {
    var vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    var frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  function init() {
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      // WebGL not supported — bg.jpg fallback remains
      return;
    }

    // WebGL available: remove static background
    document.body.style.background = 'none';

    canvas.id = 'liquidchrome-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);

    var program = createProgram(gl, VERT_SRC, FRAG_SRC);
    if (!program) return;
    gl.useProgram(program);

    // Full-screen triangle (the "big triangle" technique)
    var positions = new Float32Array([-1, -1,  3, -1,  -1,  3]);
    var uvs       = new Float32Array([ 0,  0,  2,  0,   0,  2]);

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

    // Uniform locations
    var uTime       = gl.getUniformLocation(program, 'uTime');
    var uResolution = gl.getUniformLocation(program, 'uResolution');
    var uBaseColor  = gl.getUniformLocation(program, 'uBaseColor');
    var uAmplitude  = gl.getUniformLocation(program, 'uAmplitude');
    var uFrequencyX = gl.getUniformLocation(program, 'uFrequencyX');
    var uFrequencyY = gl.getUniformLocation(program, 'uFrequencyY');
    var uMouse      = gl.getUniformLocation(program, 'uMouse');

    // Set constant uniforms
    gl.uniform3f(uBaseColor,  CONFIG.baseColor[0], CONFIG.baseColor[1], CONFIG.baseColor[2]);
    gl.uniform1f(uAmplitude,  CONFIG.amplitude);
    gl.uniform1f(uFrequencyX, CONFIG.frequencyX);
    gl.uniform1f(uFrequencyY, CONFIG.frequencyY);
    gl.uniform2f(uMouse, 0.5, 0.5);

    // Resize
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.floor(window.innerWidth  * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform3f(uResolution, canvas.width, canvas.height, canvas.width / canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse / touch interaction
    if (CONFIG.interactive) {
      document.addEventListener('mousemove', function (e) {
        gl.uniform2f(uMouse, e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
      });
      document.addEventListener('touchmove', function (e) {
        if (e.touches.length > 0) {
          var t = e.touches[0];
          gl.uniform2f(uMouse, t.clientX / window.innerWidth, 1 - t.clientY / window.innerHeight);
        }
      }, { passive: true });
    }

    // Animation loop
    var running = true;
    var animId;

    function update(t) {
      if (!running) return;
      animId = requestAnimationFrame(update);
      gl.uniform1f(uTime, t * 0.001 * CONFIG.speed);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) animId = requestAnimationFrame(update);
    });

    animId = requestAnimationFrame(update);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
