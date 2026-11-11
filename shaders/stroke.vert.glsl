#version 300 es
// One instanced quad per brushstroke.
layout(location = 0) in vec2 a_corner;   // -1..1
layout(location = 1) in vec4 a_xyal;     // x, y, angle, length   (design units, 1920x1080 space)
layout(location = 2) in vec4 a_wstc;     // width, seed, thickness, curve
layout(location = 3) in vec4 a_col;      // rgb, alpha
layout(location = 4) in vec2 a_soft;     // softness (painterly defocus), unused

uniform vec2 u_res;                      // design resolution

out vec2 v_uv;
out vec4 v_col;
out vec4 v_p;   // length, width, seed, thickness
out vec2 v_k;   // bend (in half-width units), softness

void main() {
  float len = a_xyal.w;
  float wid = max(a_wstc.x, 0.001);
  float K = a_wstc.w * len / (wid * 0.5);          // sagitta of the bent stroke, in half-widths
  float pad = 0.5 * abs(K);
  vec2 local = vec2(a_corner.x * len * 0.5, a_corner.y * wid * 0.5 * (1.0 + pad));
  float ca = cos(a_xyal.z), sa = sin(a_xyal.z);
  vec2 p = a_xyal.xy + vec2(local.x * ca - local.y * sa, local.x * sa + local.y * ca);
  vec2 ndc = p / u_res * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  v_uv = a_corner;
  v_col = a_col;
  v_p = vec4(len, wid, a_wstc.y, a_wstc.z);
  v_k = vec2(K, a_soft.x);
}
