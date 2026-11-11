// WebGL2 impasto renderer.
// Pass 1: every brushstroke is an instanced quad written to two targets —
//         pigment colour and paint height. Later strokes cover earlier ones.
// Pass 2: the height field is lit to produce ridges, furrows and gloss.

import { STRIDE } from './stage.js';
import { mulberry32 } from './rng.js';

const QUAD_VS = `#version 300 es
out vec2 v_uv;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); v_uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  return p;
}

export async function loadShaders(base = '/shaders/') {
  const names = ['stroke.vert', 'stroke.frag', 'composite.frag'];
  const out = {};
  for (const n of names) out[n] = await (await fetch(`${base}${n}.glsl`)).text();
  return out;
}

export class Renderer {
  constructor(canvas, width, height, shaders, maxStrokes = 600000) {
    this.canvas = canvas;
    canvas.width = width; canvas.height = height;
    this.w = width; this.h = height;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    this.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
    this.float = !!gl.getExtension('EXT_color_buffer_half_float') || !!gl.getExtension('EXT_color_buffer_float');

    this.pStroke = program(gl, shaders['stroke.vert'], shaders['stroke.frag']);
    this.pComp = program(gl, QUAD_VS, shaders['composite.frag']);

    // geometry
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.inst = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst);
    gl.bufferData(gl.ARRAY_BUFFER, maxStrokes * STRIDE * 4, gl.DYNAMIC_DRAW);
    const B = STRIDE * 4;
    const attr = (loc, size, off) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, B, off * 4); gl.vertexAttribDivisor(loc, 1); };
    attr(1, 4, 0); attr(2, 4, 4); attr(3, 4, 8); attr(4, 2, 12);
    gl.bindVertexArray(null);
    this.emptyVao = gl.createVertexArray();

    // targets
    const tex = (internal, format, type) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, format, type, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.tCol = tex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    this.tH = this.float ? tex(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT) : tex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tCol, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.tH, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      // fall back to 8-bit height
      this.float = false;
      this.tH = tex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.tH, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // bristle noise
    const N = 256, rnd = mulberry32(1888), px = new Uint8Array(N * N * 4);
    for (let i = 0; i < px.length; i++) px[i] = (rnd() * 256) | 0;
    this.tNoise = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tNoise);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    // overlay (title typography)
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.width = width; this.overlayCanvas.height = height;
    this.octx = this.overlayCanvas.getContext('2d');
    this.tOver = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tOver);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.u = (p, n) => gl.getUniformLocation(p, n);
  }

  /**
   * post: { ground:[r,g,b], fade:[r,g,b,a], vignette, relief, overlay:(ctx, w, h)=>void }
   */
  render(stage, post = {}) {
    const gl = this.gl, { w, h } = this;
    const ground = post.ground ?? [0.86, 0.80, 0.68];

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearBufferfv(gl.COLOR, 0, [ground[0], ground[1], ground[2], 1]);
    gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 1]);

    gl.useProgram(this.pStroke);
    gl.uniform2f(this.u(this.pStroke, 'u_res'), 1920, 1080);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tNoise);
    gl.uniform1i(this.u(this.pStroke, 'u_noise'), 0);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, stage.buf, 0, stage.n * STRIDE);
    const B = STRIDE * 4, sx = w / 1920, sy = h / 1080;
    const batches = stage.batches;
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      const end = i + 1 < batches.length ? batches[i + 1].start : stage.n;
      const count = end - b.start;
      if (count <= 0) continue;
      if (b.clip) {
        gl.enable(gl.SCISSOR_TEST);
        const [cx, cy, cw, ch] = b.clip;
        gl.scissor(Math.round(cx * sx), Math.round(h - (cy + ch) * sy), Math.max(0, Math.round(cw * sx)), Math.max(0, Math.round(ch * sy)));
      } else gl.disable(gl.SCISSOR_TEST);
      // re-point instance attributes at this batch
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, B, b.start * B + 0);
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, B, b.start * B + 16);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, B, b.start * B + 32);
      gl.vertexAttribPointer(4, 2, gl.FLOAT, false, B, b.start * B + 48);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    }
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);

    // composite
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.pComp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tCol);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tH);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.tOver);
    let hasOverlay = 0;
    if (post.overlay) {
      const ctx = this.octx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      post.overlay(ctx);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.overlayCanvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      hasOverlay = 1;
    }
    const U = (n) => this.u(this.pComp, n);
    gl.uniform1i(U('u_col'), 0); gl.uniform1i(U('u_h'), 1); gl.uniform1i(U('u_over'), 2);
    gl.uniform2f(U('u_px'), 1 / w, 1 / h);
    gl.uniform1f(U('u_scale'), w / 1920);
    gl.uniform1f(U('u_relief'), post.relief ?? 5.5);
    gl.uniform1f(U('u_overlay'), hasOverlay);
    const f = post.fade ?? [0, 0, 0, 0];
    gl.uniform4f(U('u_fade'), f[0], f[1], f[2], f[3]);
    gl.uniform1f(U('u_vignette'), post.vignette ?? 0.32);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  /** RGBA rows bottom-to-top (ffmpeg flips) */
  readPixels(out) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, this.w, this.h, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return out;
  }
}
