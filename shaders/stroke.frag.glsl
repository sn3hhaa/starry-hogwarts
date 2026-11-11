#version 300 es
// A single loaded-brush stroke: bristle streaks, a fat rounded head, a dry
// ragged tail, and a height profile (ridges where paint is pushed to the sides)
// that the composite pass lights as impasto.
precision highp float;

in vec2 v_uv;
in vec4 v_col;
in vec4 v_p;
in vec2 v_k;

uniform sampler2D u_noise;

layout(location = 0) out vec4 o_col;
layout(location = 1) out vec4 o_h;

void main() {
  float len = v_p.x, wid = v_p.y, seed = v_p.z, thick = v_p.w;
  float K = v_k.x, soft = v_k.y;

  float u = v_uv.x;
  float v = v_uv.y * (1.0 + 0.5 * abs(K)) - K * (0.5 - u * u);   // bend the centre line

  float along = u * len * 0.5;       // design units
  float across = v * wid * 0.5;
  vec2 so = vec2(seed * 37.13, seed * 91.7);

  // bristle noise: fine across the stroke, stretched along it
  float streak = texture(u_noise, vec2(along / 9000.0, across / 520.0) + so).r;
  float streak2 = texture(u_noise, vec2(along / 5200.0, across / 300.0) + so.yx).g;
  float grain = texture(u_noise, vec2(along / 700.0, across / 700.0) + so * 1.7).b;

  // capsule distance in half-width units → rounded ends
  float hw = wid * 0.5;
  float dx = max(abs(along) - max(len * 0.5 - hw, 0.0), 0.0) / hw;
  float d = length(vec2(dx, v));
  float e0 = mix(0.78, 0.15, soft);
  float edge = 1.0 - smoothstep(e0, 1.0, d + (streak - 0.5) * 0.30 * (1.0 - soft));

  // dry brush: paint runs out toward the tail, bristles separate
  float dry = smoothstep(0.15, 1.0, u);
  float gaps = smoothstep(0.42, 0.70, streak2);
  float body = 1.0 - dry * gaps * 0.85 * (1.0 - soft);
  // a few bristle gaps through the whole stroke
  body *= 1.0 - 0.35 * smoothstep(0.72, 0.86, streak2) * (1.0 - soft);

  float a = edge * body * v_col.a;
  if (a < 0.003) discard;

  // impasto height: side ridges + bristle furrows + heavier load at the head
  float av = abs(v);
  float ridge = smoothstep(0.40, 0.82, av) * (1.0 - smoothstep(0.86, 1.0, av));
  float load = 1.0 - 0.5 * smoothstep(-0.8, 0.9, u);
  float h = thick * (0.22 + 0.55 * streak + 0.42 * ridge + 0.12 * grain) * load * (1.0 - 0.8 * soft);

  // incompletely mixed pigment: value streaks along the bristles
  vec3 c = v_col.rgb * (0.86 + 0.30 * streak) + (grain - 0.5) * 0.045;

  o_col = vec4(c, a);
  o_h = vec4(clamp(h, 0.0, 1.0), 0.0, 0.0, a);
}
