import { wash, line, fireFrame } from './signatureSkillArt.ts';
import type { Paint } from './signatureSkillArt.ts';
import { paintedPalette } from './paintedSkillArt.ts';
import type { SkillRecipe } from './skillRecipes.ts';
import type { SkillPigment, SkillChoreography } from './skillChoreography.ts';
import type { getEffectLighting } from './skillEffectModel.ts';

type Brush = { paint: Paint; ink: string; light: string };
const TAU = Math.PI * 2;

/** Uneven ink, a warm wash and a narrow ivory core, not a filled lightning icon. */
function electricStroke(ctx: CanvasRenderingContext2D, path: string, b: Brush, width = 1) {
  // Blur is baked into the atlas once, never evaluated by a runtime filter.
  ctx.save(); ctx.shadowColor = '#ffcd67'; ctx.shadowBlur = 26;
  line(ctx, path, '#ffe19a', width * 3, .8); ctx.restore();
  line(ctx, path, b.ink, width * 8, .11);
  line(ctx, path, b.paint[1], width * 4.5, .27);
  line(ctx, path, b.paint[2], width * 2.2, .8);
  line(ctx, path, '#fffbea', width, 1);
}

function electricCorona(ctx: CanvasRenderingContext2D, b: Brush, contact = false) {
  const glow = ctx.createRadialGradient(-3, 2, 2, 0, 0, contact ? 103 : 92);
  glow.addColorStop(0, contact ? '#fff8dfa6' : '#fff8dfdd');
  glow.addColorStop(.2, '#ffe59b85'); glow.addColorStop(.55, '#f8cc5d36'); glow.addColorStop(1, '#edc96c00');
  ctx.fillStyle = glow; ctx.fillRect(-110, -110, 220, 220);
  if (contact) {
    for (let i = 0; i < 7; i++) {
      ctx.save(); ctx.rotate(i * TAU / 7 + i % 2 * .12);
      electricStroke(ctx, `M${i % 2 ? 19 : 29} 2l17-8 8 10 13-5 7 8 17-4`, b, 1.1 + i % 3 * .4);
      line(ctx, 'M50-4 57-18 69-23M69 6 75 19', b.paint[2], .85, .7); ctx.restore();
    }
  } else {
    wash(ctx, 'M-25 13C-37-1-19-26-4-22Q14-32 23-16Q33 3 19 16Q2 31-12 20Z',
      [b.paint[1], b.paint[2], b.light], 38, false);
    electricStroke(ctx, 'M-53 11C-59-8-38-38-17-36L-12-44Q18-43 34-25M47-13C57 8 34 39 13 36L7 43Q-16 41-27 27', b, 2.3);
    electricStroke(ctx, 'M-32 1-14-9-9 3 8-6 5 11 28 6M-47-12-62-18-73-9M34 26 47 41 61 37', b, 1.3);
    line(ctx, 'M-31-42Q-59-42-64-18M21 47Q48 50 59 26M-10-16Q6-23 14-13', b.light, 1.6, .65);
  }
}

function electricFilament(ctx: CanvasRenderingContext2D, frame: number, b: Brush) {
  const contours = [
    'M0-98-7-78 3-67-11-48-4-37-15-20 2-8-3 8 12 19 4 38 14 53 6 74 0 98',
    'M0-98 8-80-2-65 12-53 3-37 14-19-4-4 5 14-10 28-1 45-11 64 3 82 0 98',
    'M0-98-4-83 6-67-6-49 8-33-4-15 10 1-6 18 4 33-8 47 4 61-5 78 0 98',
    'M0-98 6-79-5-63 5-46-9-28 7-12-7 5 9 22-3 39 9 56-2 73 4 88 0 98',
  ];
  electricStroke(ctx, contours[frame], b, 3.4);
  const branches = [
    'M-11-48-27-42-26-26-44-18-38-6-61 8M12 19 29 10 37 17 46 9 61 14M4 38-17 44-16 55-39 65',
    'M12-53 32-45 30-30 49-21 45-10 68-4M-10 28-28 18-33 29-54 30M-1 45 21 52 23 67 42 71',
    'M-6-49-29-52-39-34-54-36-62-19M10 1 27-3 34 12 53 11M-8 47-26 57-23 67-48 79',
    'M5-46 25-39 27-21 43-26 57-13M-7 5-23 11-36 2-49 17M9 56 31 60 32 77 53 80',
  ];
  electricStroke(ctx, branches[frame], b, .85);
  // Short, broken side strokes preserve a brush edge without a full-screen glow filter.
  line(ctx, 'M-21-68-29-59M31 32 41 40M-35 39-46 47M19-76 29-68', b.paint[2], .65, .5);
}

/** All geometry/brush grain is baked once. Animation blends distinct contour drawings. */
function drawMaterial(ctx: CanvasRenderingContext2D, material: SkillPigment, frame: number, b: Brush) {
  const { paint: p, ink, light } = b;
  const t = frame / 3, bend = [-9, 7, 13, -4][frame];
  const fill = (path: string, seed = 0) => wash(ctx, path, p, seed);
  const edge = (path: string, width = 1.2, alpha = .85) => line(ctx, path, light, width, alpha);
  if (material === 'engine') {
    fill(`M-93-15Q-30-46 9-31L-2-54 38-33Q80-40 91-7L84 19 60 17 42 45 9 28-32 38-18 12-77 22Z`, frame);
    wash(ctx, `M-82-2Q-17-${19 + bend} 70-1L47 15 9 10-11 22-2 3Z`, [p[1], p[2], light], 8);
    for (let i = 0; i < 3; i++) {
      const x = -52 + i * 40;
      edge(`M${x}-24q-12 24 0 46M${x + 7}-26q-12 24 0 51`, 1.8, .85);
    }
    edge('M-80-9Q-24-31 17-20M29 24 53 28 71 14', 1.2);
  } else if (material === 'ember') {
    fill(`M84 0C79-39 30-49 0-24Q-30-51-88-${23 + bend}Q-62-4-43-2L-97 17Q-45 7-27 32C22 66 78 49 84 0Z`, frame);
    wash(ctx, `M70 1C51-29 14-26-8-10L-51-${14 + bend}Q-26 7-52 20C-3 8 13 43 49 26Z`, [p[1], '#fac06c', '#fff2c9'], 19);
    edge(`M-79 11Q-29-${20 + bend} 11 5T68 5 M-21-21Q8-32 28-25`, 1.5);
    fill(`M-93-38Q-73-42-63-${23 + bend}Q-85-27-93-38Z M-53 47-79 42-65 52Z`);
  } else if (material === 'tide') {
    fill(`M-92 76C-55 49-67-32 ${-(6 + bend)}-68C42-92 96-50 66-14C46 7 19-7 31-26C41-42 65-32 51-18C83-36 49-65 21-45C-16-13 25 42 89 72Q31 84-7 69Q-43 94-92 76Z`, frame);
    wash(ctx, `M-67 66C-27 41-45-19 1-57C30-78 68-66 76-37Q51-61 29-43C-1-21 5 13 23 36Q-7 20-5-13C-31 11-21 51-67 66Z`, [p[1], p[2], light], 13);
    edge(`M-80 72Q-42 61-31 35M31-48Q69-63 73-34M-11 51Q27 75 56 69`, 2.2);
    for (let i = 0; i < 5; i++) edge(`M${-51 + i * 21} ${64 + i % 2 * 10}q9-8 17-1`, .8, .65);
  } else if (material === 'leaf' || material === 'root') {
    if (material === 'root') {
      fill(`M-81 83C-65 35-85-12-37-28C-1-42-24-70 18-88L8-63C-9-26 20-12-25 4C-49 12-40 62-56 88Z`, frame);
      fill(`M-63 36-91 17-67 18M-44-3-47-37-30-12M-14-45-29-72-5-54M-62 59Q-${38 + bend} 7 14 13Q0 47-62 59Z`, 9);
      edge('M-65 78C-51 32-70-9-31-16Q-5-24-3-46M-58 47Q-33 21 4 18');
    } else {
      fill(`M-87 67Q-92-${35 + bend} 83-69Q82 53-87 67Z`, 9);
      wash(ctx, `M-83 63Q-27-${17 + bend} 81-66Q20-56-18-15Z`, [p[0], p[1], p[2]], 18);
      edge(`M-83 63Q-5-${6 + bend} 78-65`, 1.7);
      for (let i = 0; i < 6; i++) {
        const x = -66 + i * 21, y = 50 - i * 18;
        edge(`M${x} ${y}l-6-27M${x} ${y}l29 4`, .8, .65);
      }
      line(ctx, 'M-80 65-96 83', ink, 2);
    }
  } else if (material === 'lightning') {
    electricFilament(ctx, frame, b);
  } else if (material === 'ice' || material === 'stone' || material === 'matrix') {
    const ice = material === 'ice', matrix = material === 'matrix';
    const path = ice ? 'M0-91 28-52 35 42 2 94-37 38-29-54Z'
      : matrix ? 'M-61-52 21-73 68-31 61 55-18 79-69 28Z' : 'M-69-42-15-78 55-56 79 12 30 73-43 65-81 11Z';
    fill(path, 24);
    wash(ctx, ice ? 'M0-91-8 23 2 94 35 42 28-52Z' : 'M-15-78-8-3 79 12 55-56Z', [p[1], p[2], light], 27);
    line(ctx, ice ? 'M0-91-8 23 2 94M-8 23-37 38M-8 23 35 42' : 'M-15-78-8-3-43 65M-8-3 79 12M-81 11-8-3 30 73', ink, 1.5, .7);
    edge(ice ? 'M-23-49-27 33-5 72M5-72 23-48 28 20' : 'M-69-39-16-73 48-54M-72 12-43 57', 1.3);
    if (matrix) {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const x = -41 + i * 28, y = -35 + j * 28;
        line(ctx, `M${x} ${y}h14v18h-14Z`, (i + j + frame) % 3 ? light : ink, 1.6, .8);
      }
      edge('M-75-65h-8v130h8M74-65h8v130h-8', 2);
    } else {
      const cracks = ['M-8 23 6 6 0-15', 'M-8 23 6 6 0-15 15-37M6 6 26 7', 'M-8 23 6 6 0-15 15-37 9-56M6 6 26 7M-8 23-27 0', 'M-8 23 6 6 0-15 15-37M6 6 26 7M-8 23-27 0-21-22'];
      edge(cracks[frame], .75);
    }
  } else if (material === 'venom' || material === 'slime' || material === 'mud') {
    fill(`M-83 61C-93 12-61 3-55-${18 + bend}Q-37-62-9-40Q6-91 24-60C27-25 63-31 69 3Q96 9 88 54Q57 86 24 62Q-22 92-83 61Z`, frame);
    wash(ctx, `M-61 51Q-69 14-35 8Q-42-21-16-21Q5-51 14-38Q-8 0 17 14Q-5 38-25 32Q-52 26-61 51Z`, [p[1], p[2], light], 8);
    edge('M-65 53Q-39 76-11 58M37 54Q62 64 75 45M-51-5Q-51-24-37-28', 1.8, .6);
    if (material === 'venom') for (let i = 0; i < 3; i++) {
      const x = -47 + i * 42, y = -13 + i % 2 * 30 - bend;
      edge(`M${x - 7} ${y}a8 8 0 1 1 16 0`, 1.8);
    }
    if (material === 'mud') { ctx.save(); ctx.translate(20, 8); ctx.scale(.37, .32); drawMaterial(ctx, 'stone', frame, b); ctx.restore(); }
  } else if (material === 'spore') {
    fill(`M-84 0Q-63-${82 + bend} 0-75Q68-79 84 0Q41 26-84 0Z`, frame);
    wash(ctx, 'M-14 6-18 66Q2 87 24 63L13 8Z', [p[0], '#b6ad84', '#f0dfb2'], 13);
    edge('M-66-12Q-42-56-3-59M-72 4Q0 20 76 3', 2);
    for (let i = 0; i < 7; i++) {
      const x = -59 + i * 19, y = -22 - Math.sin(i / 6 * Math.PI) * 27;
      edge(`M${x} ${y}q-7-13 5-9q10 5 3 10`, 3, .72);
    }
    for (let i = 0; i < 7; i++) line(ctx, `M0 5l${-62 + i * 21} -3`, ink, .7, .5);
  } else if (material === 'feather' || material === 'butterfly') {
    if (material === 'feather') {
      fill(`M-77 87C-80 30-${74 + bend}-44 66-92Q84-50 59-14L46-7 54-6 27 27 11 30 19 34-15 56-33 58-24 65Z`, frame);
      edge('M-73 82Q-20-12 62-82', 1.8);
      for (let i = 0; i < 10; i++) {
        const x = -63 + i * 12, y = 66 - i * 14;
        edge(`M${x} ${y}q-12-24 1-39M${x} ${y}l28-8`, .65, .6);
      }
    } else {
      const wing = [82, 57, 24, 67][frame];
      for (const side of [-1, 1]) {
        ctx.save(); ctx.scale(side, 1);
        fill(`M0 0C${wing} -103 ${wing + 23} -27 ${wing * .5} 0C${wing + 8} 44 ${wing * .3} 80 0 0Z`, frame);
        wash(ctx, `M6-4Q${wing * .8}-61 ${wing * .78}-30Q${wing * .6}-7 6-4Z`, [p[1], p[2], light], 5);
        edge(`M6-3 ${wing * .88}-52M7 7 ${wing * .52} 43M12-6 ${wing * .66}-21`, 1.2);
        line(ctx, `M${wing * .5} 24q9-6 12 3q-3 10-12-3`, ink, 2);
        ctx.restore();
      }
      line(ctx, 'M0-24V30M0-21Q-16-44-22-31M0-21Q16-44 22-31', ink, 3);
    }
  } else if (material === 'chain') {
    const tilt = bend * .18;
    ctx.save(); ctx.rotate(tilt * .04);
    // A real aperture, rather than an opaque lozenge, keeps linked chains readable.
    const link = new Path2D('M-38-57Q0-82 38-57L60-5Q73 34 40 55L7 72Q-29 83-47 47L-63 9Q-78-32-38-57ZM-29-34Q-3-54 15-31L34 7Q42 26 22 37L2 45Q-13 53-23 29L-37-3Q-44-22-29-34Z');
    ctx.fillStyle = p[0]; ctx.fill(link, 'evenodd'); ctx.strokeStyle = p[1]; ctx.lineWidth = 6; ctx.stroke(link);
    edge('M-40-49Q-8-75 24-51L44-8M38 48 6 64Q-20 72-36 45L-52 10', 3);
    line(ctx, 'M-43-17-25-24M-34 5-17-3M21 31 33 47', ink, 2); ctx.restore();
  } else if (material === 'serpent') {
    fill(`M-68 93C-112 18-79-67-23-70C${48 + bend}-79 76-34 40-15L18-12 1-29 24-33Q49-48 5-52C-52-64-68 13-44 82Z`, frame);
    wash(ctx, 'M-64 79C-94 11-66-59-24-61Q-69-35-50 75Z', [p[0], p[1], p[2]], 12);
    edge('M-64 70C-93-5-60-61-23-62M29-26 48-27', 1.2);
    wash(ctx, 'M25-48 36-45 27-38Z', [ink, '#ce9a50', '#fff0a6'], 2);
    line(ctx, 'M23-16 16-2 10-12M-60 3l17 5M-57 22l17 4M-51 42l15 3', ink, 1.7);
  } else if (material === 'sword' || material === 'candy') {
    fill('M0-97 15-73 9 38 31 43 29 53 7 49 7 76 0 88-7 76-7 49-29 53-31 43-9 38-15-73Z', 11);
    wash(ctx, 'M0-93-8-70-5 37 0 41Z', [p[1], p[2], light], 4);
    line(ctx, 'M0-88V36M-22 46H22M-4 61H4M-4 70H4', light, 1);
    if (material === 'candy') {
      ctx.save(); ctx.clip(new Path2D('M0-92 11-70 6 36-6 36-11-70Z'));
      for (let i = 0; i < 6; i++) line(ctx, `M-19 ${-82 + i * 24}l38 24`, '#f4c4b8', 9, .75);
      ctx.restore();
    }
    const y = -72 + t * 97;
    edge(`M-9 ${y}l17-13`, 2, .9);
    wash(ctx, 'M0 35 6 41 0 48-6 41Z', [p[0], p[1], light], 3);
  } else if (material === 'claw') {
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(i * 27 - 26, i * -11 + 11);
      fill(`M-38-74Q-${27 + bend}-3 58 72Q-3 58-38-74Z`, frame);
      edge('M-36-69Q-17 12 53 65', 1.6); ctx.restore();
    }
  } else if (material === 'moon' || material === 'wisp' || material === 'rift') {
    fill(`M${23 + bend}-85C-69-112-116 43-16 85Q-60 43-36-7Q-17-52 ${23 + bend}-85Z`, frame);
    edge(`M13-85C-69-82-97 34-33 72`, 2);
    if (material === 'wisp') {
      fill(`M5-33Q42-51 42-14L61 20 42 15 29 49 18 29-4 52-8 19-30 29-14-8Z`, frame);
      line(ctx, 'M9-4 15 0M34-7 28-1', light, 3);
    } else if (material === 'rift') {
      wash(ctx, `M-6-102 12-42 3-10 25 10 9 31 0 99-13 40-7 15-25-2-10-31Z`, [ink, p[0], p[1]], frame);
      edge('M-3-96 8-42-1-10 20 10 5 31 0 88', 2);
    } else edge('M45-64Q101-12 51 64M58-46Q85-7 62 35', 2.3, .7);
  } else if (material === 'calculus') {
    fill(`M-91 67C-73-${45 + bend} 21-112 91-47Q-4-56-91 67Z`, frame);
    edge('M-87 61C-46-35 30-84 83-49', 1.8);
    line(ctx, 'M-64 15H77M-24 69V-70M-54 43C-12 41-12-46 47-42', p[1], 2.1);
    for (let i = 0; i < 8; i++) line(ctx, `M${-43 + i * 14} 15v${-7 - i * 7}`, light, .7, .72);
    edge('M57-65Q29-77 29-33T7 4', 3);
  } else {
    const drift = bend * .65;
    const knot = `M-83 0C-85-77-25-71 10 0S91 74 85 0S25-71-10 0S-83 77-83 0`;
    line(ctx, knot, p[0], 14); line(ctx, knot, p[1], 9); line(ctx, knot, light, 1.4);
    line(ctx, `M${-16 + drift}-78C81-38 43 55 11 77C-81 44-46-56 ${-16 + drift}-78Z`, p[0], 9);
    line(ctx, `M${-16 + drift}-78C81-38 43 55 11 77C-81 44-46-56 ${-16 + drift}-78Z`, p[2], 4);
    edge('M-35-33Q-25-24-10 0M10 0Q26 29 39 40', 4);
  }
}

function drawActionForm(ctx: CanvasRenderingContext2D, plan: SkillChoreography, frame: number, b: Brush) {
  const { pigment, action } = plan;
  if (action === 'sprout' && pigment === 'ember') {
    fireFrame(ctx, frame);
  } else if (action === 'sprout' && pigment === 'stone') {
    wash(ctx, 'M-36 90-45-39-18-90 17-96 44-46 37 91Z', b.paint, frame);
    wash(ctx, 'M-18-90-11 88 13 87 17-96Z', [b.paint[1], b.paint[2], b.light], 13);
    line(ctx, 'M-43-36-18-25 17-31 41-43M-18-25-11 88M17-31 13 87M-33 19-18 31-22 50M23 5 35-4', b.ink, 1.1, .65);
    line(ctx, 'M-34-41-14-79M-9-64-6 6M21-39 32-46', b.light, 1.4);
  } else if (action === 'vector' && pigment === 'matrix') {
    wash(ctx, 'M-99-8 34-9 19-31 98 0 19 31 34 9-99 8Z', b.paint, frame);
    line(ctx, 'M-91 0H85M22-25 82 0 22 25', b.light, 1.6);
    line(ctx, 'M-65-31V31M-38-23V23M-16-19V19M-79-19H8M-79 19H8', b.paint[1], 1.2);
  } else if ((action === 'orb' || action === 'drain') && pigment === 'tide') {
    const radius = [64, 68, 65, 61][frame];
    ctx.save(); ctx.globalAlpha = .13; ctx.fillStyle = b.paint[1]; ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.fill(); ctx.restore();
    line(ctx, `M${-radius} 0a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 -${radius * 2} 0`, b.paint[0], 4);
    line(ctx, `M-${radius - 8}-5Q-${radius - 11}-${radius - 13}-4-${radius - 7}M8 ${radius - 8}Q${radius - 9} ${radius - 12} ${radius - 8} 6`, b.light, 3);
    line(ctx, 'M-30-31Q-12-52 6-45', b.light, 6, .6);
  } else if (action === 'meteor' && pigment === 'ember') {
    drawMaterial(ctx, 'ember', frame, b);
    ctx.save(); ctx.translate(37, 5); ctx.scale(.5, .5);
    drawMaterial(ctx, 'stone', frame, { paint: ['#322e32', '#745042', '#ce8450'], ink: '#211f29', light: '#ffd193' }); ctx.restore();
    line(ctx, 'M20-19 39-11 34 12 55 17M26 5 14 16', '#ffc771', 2.6);
  } else if (action === 'mirror') {
    wash(ctx, 'M-51-77 49-74 72-4 47 78-49 79-73 5Z', b.paint, frame);
    wash(ctx, 'M-40-60 37-58 55-4 34 58-36 62-54 4Z', [b.ink, b.paint[1], b.light], 14);
    line(ctx, 'M-39-58 37-57 54-3 34 57-35 60-52 4Z', b.light, 2.3);
    ctx.save(); ctx.clip(new Path2D('M-40-60 37-58 55-4 34 58-36 62-54 4Z'));
    line(ctx, `M${-57 + frame * 10} 65l97-141`, b.light, 12, .25);
    line(ctx, 'M-44 15 14-56M-14 60 47-23', b.light, 2, .65); ctx.restore();
    line(ctx, 'M-63 10-58 31M-45-69-25-69M54 39 48 57', b.paint[0], 1.4);
  } else if (action === 'rift') {
    const offset = [-4, 8, -8, 3][frame];
    wash(ctx, `M-4-102 15-61 7-29 24-1 9 24 ${offset} 101-16 51-9 17-26-8-11-43Z`, [b.ink, b.paint[0], b.paint[1]], frame);
    line(ctx, `M-2-96 12-61 4-29 21-1 6 24 ${offset} 92`, b.light, 2.4);
    line(ctx, 'M10-26 47-47 69-42 88-62M-15 14-38 31-50 21-84 42M9 26 34 51 56 43', b.paint[1], 2);
    line(ctx, 'M11-24 47-44 68-39M-16 17-37 34-50 24', b.light, .8);
  } else if (action === 'bloom' && pigment === 'venom') {
    const opening = [24, 45, 63, 49][frame];
    for (let i = -2; i <= 2; i++) {
      ctx.save(); ctx.rotate(i * .31);
      wash(ctx, `M0 61Q-${opening}-11 0-77Q${opening}-11 0 61Z`, b.paint, i + 8);
      line(ctx, 'M0 54Q-13 6 0-62', b.light, 1.2, .8); ctx.restore();
    }
    wash(ctx, 'M-20 56Q0 29 20 56L0 73Z', [b.paint[0], '#c2b764', '#f2db9c'], 6);
  } else if (action === 'surge' && pigment === 'candy') {
    wash(ctx, 'M-41-44 39-43 46 41-40 47Z M-44-24-88-58-77 51-44 29Z M43-26 87-59 77 48 46 29Z', b.paint, frame);
    line(ctx, 'M-33-30 32-31 35 30-30 35Z', b.light, 2);
    ctx.save(); ctx.clip(new Path2D('M-36-37 35-36 39 36-35 40Z'));
    for (let i = 0; i < 5; i++) line(ctx, `M${-68 + i * 26}-42l67 94`, '#f4d6bd', 9, .72);
    ctx.restore(); line(ctx, 'M-52-25-71-39M51-25 70-39M-50 26-67 36M53 26 65 35', b.light, 1.4);
  } else if (action === 'clamp') {
    wash(ctx, 'M-37 86-79 28-78-26-43-73 3-88 60-51 26-21 5-53-26-32-29 11 11 30 53-8 67 33 23 77Z', b.paint, frame);
    wash(ctx, 'M-70-23-39-64 3-76 47-51 30-32 6-62-34-41-41 9Z', [b.paint[1],b.paint[2],b.light], 13);
    line(ctx, 'M-45 64-57 19-56-26M-56-26-27-32M-57 19-29 11M2 47 34 30', b.ink, 1.6);
  } else if (action === 'claws' && pigment === 'serpent') {
    wash(ctx, 'M-66-78Q-20-52 0-61L-24 76Q-43 29-66-78Z M15-67Q41-49 70-78L44 64Z', b.paint, frame);
    line(ctx, 'M-56-62-27 62M25-53 43 46', b.light, 2.2);
  } else if ((action === 'claws' && pigment === 'ice') || ((action === 'cut' || action === 'cross') && ['venom', 'sword', 'candy', 'wisp'].includes(pigment))) {
    const tip = [[-15,-71],[39,-85],[89,-25],[90,56]][frame];
    wash(ctx, `M-97 78C-94-18-23-111 ${tip[0]} ${tip[1]}Q-42-53-97 78Z`, b.paint, frame);
    line(ctx, `M-94 72C-58-35-12-91 ${tip[0]} ${tip[1]}`, b.light, 2);
    for (let i = 0; i < 4; i++) line(ctx, `M${-75 + i * 6} ${40 - i * 11}Q-23-53 ${tip[0] - i * 9} ${tip[1] + i * 4}`, b.paint[1], .8, .8);
    if (pigment === 'ice') wash(ctx, 'M-48-40-49-67-32-46Z M-6-70 11-95 9-66Z M38-57 66-66 48-40Z', b.paint, 9);
    if (pigment === 'wisp') {
      line(ctx, 'M17-69-21 91', b.ink, 6);
      line(ctx, 'M17-69-21 91', b.paint[1], 3);
      line(ctx, 'M-15 68 5 29M3-38 12-57', b.light, 1.2, .7);
    }
  } else drawMaterial(ctx, pigment, frame, b);
}

export function paintChoreographyAtlas(plan: SkillChoreography, recipe: SkillRecipe, type: string,
  lighting: ReturnType<typeof getEffectLighting>): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Choreography texture unavailable');
  const c = paintedPalette(recipe, type);
  const material = plan.pigment;
  const b: Brush = { paint: [c.shade, c.pigment, c.light], ink: c.ink,
    light: lighting === 'night' ? '#f4efda' : c.highlight };
  if (material === 'lightning') {
    b.paint = plan.action === 'chain' ? ['#433e56', '#9e8aaf', '#e7c979'] : ['#71674e', '#c2a256', '#f2d587'];
    b.ink = plan.action === 'chain' ? '#36334f' : '#655e47';
    b.light = lighting === 'night' ? '#f4e9c9' : '#fff4d6';
  }
  const soft = ['tide', 'venom', 'slime', 'mud', 'ember', 'wisp'].includes(material);
  for (let tile = 0; tile < 8; tile++) {
    ctx.save(); ctx.beginPath(); ctx.rect(tile % 4 * 512, Math.floor(tile / 4) * 512, 512, 512); ctx.clip();
    ctx.translate(tile % 4 * 512 + 256, Math.floor(tile / 4) * 512 + 256);
    ctx.scale(2.26, 2.26); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (material === 'lightning') {
      if (tile < 4) electricFilament(ctx, tile, b);
      else if (tile === 4) electricStroke(ctx, 'M-25-56-11-33-19-11 6 2-1 23 21 49M-19-11-39 1-34 18', b, 3);
      else if (tile === 5) {
        const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 106);
        glow.addColorStop(0, '#fff1b5b3'); glow.addColorStop(.3, '#f5ca6b73');
        glow.addColorStop(.65, '#e8ab4033'); glow.addColorStop(1, '#e8ab4000');
        ctx.fillStyle = glow; ctx.fillRect(-110, -110, 220, 220);
        electricStroke(ctx, 'M-85 17-67 5-49 11-36-8-17 0-3-11 16 3 31-7 43 7 63 2 85 18M-49 11-55 30-74 39M43 7 56-27 71-34M-17 0-30-32-45-38', b, 1.6);
        line(ctx, 'M-64 50Q-31 64-8 52M29-48Q51-47 64-37', b.paint[1], 2, .3);
      } else electricCorona(ctx, b, tile === 6);
    } else if (tile < 4) drawActionForm(ctx, plan, tile, b);
    else if (tile === 4) {
      if (['leaf', 'butterfly', 'feather', 'spore'].includes(material)) drawMaterial(ctx, material, 1, b);
      else wash(ctx, soft ? 'M-4-68C-28-17-45 3-28 35C-11 64 32 53 32 23Q27-6-4-68Z'
        : 'M-24-62 28-29 15 11-21 68-38 4Z', b.paint, 18);
      line(ctx, 'M-15-31-22 8', b.light, 2);
    } else if (tile === 5) {
      wash(ctx, 'M-95 21C-117-31-55-86 19-76Q-58-65-86-12Z M-65 54Q8 98 79 31L90 17Q39 98-26 83Z M35-75Q90-64 93-19L85-26Q80-58 35-75Z', b.paint, 3, false);
      line(ctx, 'M-82 36Q-61 73-25 74M51-66Q92-43 92-11M-43-3-17 7 9-7 31 5 52-5', b.light, 1.2, .7);
    } else if (tile === 6) {
      if (soft) {
        wash(ctx, 'M-70 49C-97 8-97-39-78-64Q-87-20-39 4L-53-50Q-16-18-2 16Q26-1 17-58Q56-32 37 12Q80-9 85-50Q103-4 73 41L29 56 9 38-13 62-35 45Z', b.paint, 27, false);
        line(ctx, 'M-77-44Q-87-5-46 31M25-34Q44-9 18 30M83-27Q88 3 57 31', b.light, 1.6, .8);
      } else for (let i = 0; i < 7; i++) {
        ctx.save(); ctx.rotate(i * TAU / 7 + .3); ctx.translate(0, -18 - i % 3 * 9); ctx.scale(.5 + i % 3 * .15, .6 + i % 2 * .25);
        wash(ctx, 'M-5-18-19-42-9-91 8-33Z', b.paint, i * 3, false);
        line(ctx, 'M-7-33-10-62', b.light, 1, .7); ctx.restore();
      }
    } else {
      ctx.scale(1.82, 1.82);
      // Preserve each named move's symbol as fine ink, never an opaque badge.
      line(ctx, recipe.mark, b.ink, 2.1, .8);
      line(ctx, recipe.mark, b.light, .8, .92);
    }
    ctx.restore();
  }
  return canvas;
}
