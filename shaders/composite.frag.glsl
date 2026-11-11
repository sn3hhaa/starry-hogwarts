#version 300 es
// Final pass: light the accumulated paint relief like a raking studio lamp on
// an oil painting, add canvas weave, grade, vignette and the title overlay.
precision highp float;

in vec2 v_uv;
uniform sampler2D u_col;
uniform sampler2D u_h;
uniform sampler2D u_over;
uniform vec2 u_px;        // 1 / render size
uniform float u_scale;    // render width / 1920
uniform float u_relief;
uniform float u_overlay;  // 0/1
uniform vec4 u_fade;      // rgb, amount
uniform float u_vignette;

out vec4 o;

float weave(vec2 p) {
  // linen: two crossed thread directions with slight irregularity
  float a = sin(p.x * 2.6 + sin(p.y * 0.21) * 0.8);
  float b = sin(p.y * 2.6 + sin(p.x * 0.19) * 0.8);
  return a * b * 0.5 + 0.5;
}

float height(vec2 uv) {
  float h = texture(u_h, uv).r;
  vec2 p = uv / u_px / u_scale;                 // design units
  return h + weave(p) * 0.035 * (1.0 - smoothstep(0.0, 0.5, h));   // weave shows through thin paint
}

void main() {
  vec2 uv = v_uv;
  float hl = height(uv - vec2(u_px.x, 0.0));
  float hr = height(uv + vec2(u_px.x, 0.0));
  float hd = height(uv - vec2(0.0, u_px.y));
  float hu = height(uv + vec2(0.0, u_px.y));
  vec2 g = vec2(hr - hl, hu - hd) * u_relief * u_scale;

  vec3 n = normalize(vec3(-g, 1.0));
  vec3 L = normalize(vec3(-0.55, 0.62, 0.56));          // raking light from the upper left
  float diff = dot(n, L) - L.z;
  vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, Hh), 0.0), 48.0) - pow(Hh.z, 48.0);

  vec3 c = texture(u_col, uv).rgb;
  c *= 1.0 + diff * 0.95;
  c += max(spec, 0.0) * vec3(1.0, 0.97, 0.9) * 0.30;

  // gentle filmic shoulder + a little extra chroma, the way varnish deepens oils
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.08);
  c = c / (1.0 + max(c - 0.82, 0.0) * 0.6);

  // vignette
  vec2 q = uv - 0.5;
  float vg = 1.0 - u_vignette * smoothstep(0.35, 0.95, length(q * vec2(1.0, 0.82)) * 1.35);
  c *= vg;

  c = mix(c, u_fade.rgb, u_fade.a);

  if (u_overlay > 0.5) {
    vec4 ov = texture(u_over, uv);
    c = mix(c, ov.rgb / max(ov.a, 0.001), ov.a);
  }
  o = vec4(c, 1.0);
}
