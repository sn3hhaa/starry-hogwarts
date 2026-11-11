// The film's pigment box. Every colour in every shot comes from here, which is
// what keeps forty shots feeling like one painting. Ramps run dark → light.

export const PAL = {
  // --- blues: cobalt / ultramarine night ---
  night: ['#0a1238', '#0e1c54', '#142c78', '#1c429c', '#2a5fc0', '#4a87d2', '#7db2e0', '#b4d8ec'],
  nightDeep: ['#070c26', '#0a1238', '#0e1c54', '#142c78', '#1c429c'],
  prussian: ['#081226', '#0d1c36', '#12304a', '#1a4660', '#2a6480'],
  // --- daylight sky ---
  day: ['#3f78b8', '#5a98cc', '#7db6da', '#a4d0e4', '#cfe6ea', '#f1f0dc'],
  // --- storm ---
  storm: ['#0b1020', '#141c34', '#1f2c48', '#2f4260', '#4a6278', '#7a9498'],
  // --- yellows / golds ---
  gold: ['#b8741a', '#d9911c', '#f0b21e', '#f7cf3a', '#fbe36e', '#fff4b8'],
  lamp: ['#e8961a', '#f4b62a', '#fad648', '#fdeb8c', '#fff8d0'],
  wheat: ['#a8741e', '#c8922a', '#e0b23a', '#eccb58', '#f4de86'],
  // --- oranges / reds ---
  orange: ['#8a3a14', '#b4501a', '#d46e1e', '#e88c2a', '#f2aa4a'],
  scarlet: ['#4a1210', '#7a1c16', '#a3281c', '#c63a24', '#e05a34'],
  crimson: ['#3a0c14', '#6a1420', '#96202a', '#bc3438'],
  // --- greens ---
  olive: ['#2a3a1c', '#40562a', '#5c7632', '#7d943a', '#a2b550', '#c6cf74'],
  cypress: ['#0c1c1a', '#14302a', '#1e4636', '#2e5e40', '#4a7a48'],
  emerald: ['#0a2a22', '#12453a', '#1c6450', '#2c8468', '#58a888'],
  sick: ['#0c1a14', '#16301e', '#2a5230', '#4c8048', '#8cbc6c', '#d0e8a8'],
  // --- earths ---
  earth: ['#2a1a10', '#44291a', '#634026', '#865a32', '#a87a44', '#c8a060'],
  ochre: ['#6a4a1e', '#8e682a', '#b48a3c', '#d2ac58', '#e6ca82'],
  stone: ['#1c2038', '#2a3050', '#3e4668', '#5a6282', '#808aa0', '#aab0b8'],
  stoneWarm: ['#3a2c24', '#55402f', '#74583e', '#967650', '#b89868', '#d6bc8c'],
  drab: ['#2e2a26', '#463f38', '#5e554a', '#7a6f60', '#968a78', '#b0a590'],
  // --- violets ---
  violet: ['#1a1238', '#2c2058', '#44307c', '#6248a0', '#8468be', '#b094d8'],
  plum: ['#22102a', '#3c1c44', '#5a2c60', '#7c447e', '#a0689c'],
  // --- neutrals ---
  black: ['#07080f', '#0e101c', '#161a2a', '#22263a', '#30364c'],
  white: ['#9aa6b4', '#bcc6cc', '#dcdfd6', '#f0ecd8', '#fbf6e4'],
  silver: ['#6c7890', '#909cb0', '#b6c0cc', '#d8dee0', '#f2f2ea'],
  // --- skin (Van Gogh portraits: ochre lights, green-grey shadows) ---
  skin: ['#8a6a48', '#b08458', '#d0a070', '#e6bc8a', '#f4d6a8'],
  skinPale: ['#8e8468', '#b4a884', '#d2c8a2', '#e8dfbe', '#f6f0d8'],
  skinRuddy: ['#8a5236', '#b06c44', '#cf8a58', '#e4a874', '#f2c698'],
  // --- hair ---
  hairBlack: ['#07080f', '#10121e', '#1a2036', '#2a3454'],
  hairRed: ['#7a2c0c', '#a84410', '#d0601a', '#ee8424', '#f8a840'],
  hairBrown: ['#2c1a0e', '#4a2c16', '#6c4420', '#8e602e', '#b08244'],
  hairBlond: ['#a89048', '#ccb464', '#e6d48a', '#f6ecb8'],
  // outline ink
  ink: ['#0b1028', '#11183a', '#181230'],
  canvas: '#d8cbb0',
};

export const INK = PAL.ink;
