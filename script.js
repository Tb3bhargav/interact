import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

const destinations = {
  kashi: {
    index: 1, sanskrit: 'काशी', title: 'City of light,<br /><em>river of memory.</em>',
    description: 'At the bends of the Ganga, a thousand years of mantra, music and learning flow into the present.',
    years: '2000+ years', orbit: 'GANGA · KĀŚĪ',
    colors: ['#24124b', '#e14a34', '#ffb72d', '#d9ff4d'],
  },
  ujjain: {
    index: 2, sanskrit: 'उज्जयिनी', title: 'Where time turns,<br /><em>and stars speak.</em>',
    description: 'An ancient celestial capital, where shadow, stone and starlight measured the rhythm of the cosmos.',
    years: '2500+ years', orbit: 'KĀL · UJJAYINĪ',
    colors: ['#150b42', '#4059f2', '#9e64ff', '#49f0c3'],
  },
  nalanda: {
    index: 3, sanskrit: 'नालन्दा', title: 'A library without<br /><em>a horizon.</em>',
    description: 'Across courtyards of red earth, seekers gathered to turn inquiry into a shared and luminous art.',
    years: '1500+ years', orbit: 'JÑĀNA · NĀLANDĀ',
    colors: ['#3a0a25', '#bf3068', '#f28a2e', '#f2df71'],
  },
};

const state = { current: 'kashi', phase: 'idle' };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (selector) => document.querySelector(selector);
const dom = {
  sanskrit: $('#destinationSanskrit'), title: $('#destinationTitle'), description: $('#destinationDescription'),
  years: $('#destinationYears'), orbit: $('#orbitLabel'), progress: $('#progressLabel'), progressLine: $('#progressLine'),
  buttons: [...document.querySelectorAll('.destination')], copy: $('.hero-copy'), meta: $('.hero-meta'),
  hero: $('.hero'), menu: $('#journeyMenu'), menuButton: $('#menuButton'), closeMenu: $('#closeMenu'), menuDestinations: [...document.querySelectorAll('.menu-destinations [data-destination]')],
};

const container = $('#webgl');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const fragmentShader = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uProgress;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform vec3 uFromA;
  uniform vec3 uFromB;
  uniform vec3 uFromC;
  uniform vec3 uFromD;
  uniform vec3 uToA;
  uniform vec3 uToB;
  uniform vec3 uToC;
  uniform vec3 uToD;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.,0.)), f.x), mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), f.x), f.y);
  }
  float fbm(vec2 p) { float v = 0., a = .5; for(int i=0;i<5;i++){ v += a*noise(p); p = p*2.02 + 3.1; a *= .5;} return v; }
  void main() {
    vec2 uv = vUv;
    vec2 parallax = (uPointer - .5) * vec2(.045, .028);
    uv += parallax * (.35 + uv.y * .65);
    vec2 p = uv; p.x *= uResolution.x / uResolution.y;
    float n1 = fbm(p * 2.1 + vec2(uTime*.035, -uTime*.055));
    float n2 = fbm(p * 5.4 - vec2(uTime*.075, uTime*.03));
    float liquid = (n1 * .68 + n2 * .32) - .5;
    float curtain = smoothstep(1.0-uProgress-.11, 1.0-uProgress+.11, uv.x + liquid*.19);

    vec3 fromBase = mix(uFromA, uFromB, smoothstep(0., 1., uv.y + liquid*.25));
    vec3 fromGlow = mix(uFromC, uFromD, smoothstep(.18, .92, n1 + uv.x*.28));
    vec3 toBase = mix(uToA, uToB, smoothstep(0., 1., uv.y + liquid*.25));
    vec3 toGlow = mix(uToC, uToD, smoothstep(.18, .92, n1 + uv.x*.28));
    float sun = 1.0 - length(uv - (vec2(.72, .35) + parallax * 2.0)) * 1.45;
    sun = smoothstep(.0, 1., sun);
    vec3 fromColor = mix(fromBase, fromGlow, .72) + uFromD * sun * .45;
    vec3 toColor = mix(toBase, toGlow, .72) + uToD * sun * .45;
    vec3 color = mix(fromColor, toColor, curtain);

    float arc = abs(length((uv - vec2(.63,.47))*vec2(1.1,.72)) - .34 - liquid*.025);
    color += mix(uFromD, uToD, curtain) * (1.0-smoothstep(.001, .007, arc)) * .38;
    float lines = smoothstep(.94, 1., sin((uv.y + liquid*.08)*90.0) * .5 + .5) * .09;
    color += mix(uFromC, uToC, curtain) * lines;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const toColor = (hex) => new THREE.Color(hex);
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }, uProgress: { value: 0 }, uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }, uPointer: { value: new THREE.Vector2(.5, .5) },
    uFromA: { value: toColor(destinations.kashi.colors[0]) }, uFromB: { value: toColor(destinations.kashi.colors[1]) },
    uFromC: { value: toColor(destinations.kashi.colors[2]) }, uFromD: { value: toColor(destinations.kashi.colors[3]) },
    uToA: { value: toColor(destinations.kashi.colors[0]) }, uToB: { value: toColor(destinations.kashi.colors[1]) },
    uToC: { value: toColor(destinations.kashi.colors[2]) }, uToD: { value: toColor(destinations.kashi.colors[3]) },
  }, vertexShader, fragmentShader,
});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

function render(time) {
  material.uniforms.uTime.value = time * .001;
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

function applyDestination(id) {
  const next = destinations[id];
  dom.sanskrit.textContent = next.sanskrit;
  dom.title.innerHTML = next.title;
  dom.description.textContent = next.description;
  dom.years.textContent = next.years;
  dom.orbit.textContent = next.orbit;
  dom.progress.textContent = `0${next.index} — 03`;
  dom.progressLine.style.width = `${next.index * 33.333}%`;
  dom.buttons.forEach((button) => {
    const active = button.dataset.destination === id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function transitionTo(id) {
  if (id === state.current || state.phase !== 'idle') return;
  state.phase = 'transitioning';
  const next = destinations[id];
  ['uToA', 'uToB', 'uToC', 'uToD'].forEach((key, index) => material.uniforms[key].value.set(next.colors[index]));

  gsap.timeline({
    defaults: { ease: 'power3.inOut' },
    onComplete: () => {
      ['uFromA', 'uFromB', 'uFromC', 'uFromD'].forEach((key, index) => material.uniforms[key].value.set(next.colors[index]));
      state.current = id; state.phase = 'idle'; material.uniforms.uProgress.value = 0;
    },
  })
    .to([dom.copy, dom.meta], { opacity: 0, y: -14, duration: reducedMotion ? .01 : .16 })
    .to(material.uniforms.uProgress, { value: 1, duration: reducedMotion ? .01 : .48 }, 0)
    .call(() => applyDestination(id), null, reducedMotion ? .01 : .28)
    .fromTo([dom.copy, dom.meta], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: reducedMotion ? .01 : .24 }, reducedMotion ? .01 : .3);
}

dom.buttons.forEach((button) => button.addEventListener('click', () => transitionTo(button.dataset.destination)));
$('#exploreButton').addEventListener('click', () => document.querySelector('.intro-section').scrollIntoView({ behavior: 'smooth' }));
function setMenu(open) {
  dom.menu.classList.toggle('is-open', open);
  dom.menu.setAttribute('aria-hidden', String(!open));
  dom.menu.inert = !open;
  dom.menuButton.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  (open ? dom.closeMenu : dom.menuButton).focus();
}

dom.menuButton.addEventListener('click', () => setMenu(!dom.menu.classList.contains('is-open')));
dom.closeMenu.addEventListener('click', () => setMenu(false));
dom.menuDestinations.forEach((button) => button.addEventListener('click', () => {
  transitionTo(button.dataset.destination);
  setMenu(false);
}));

const journeyIds = Object.keys(destinations);
function travel(direction) {
  const currentIndex = journeyIds.indexOf(state.current);
  const nextIndex = (currentIndex + direction + journeyIds.length) % journeyIds.length;
  transitionTo(journeyIds[nextIndex]);
}

let dragStartX = null;
dom.hero.addEventListener('pointermove', (event) => {
  const rect = dom.hero.getBoundingClientRect();
  material.uniforms.uPointer.value.set((event.clientX - rect.left) / rect.width, 1.0 - (event.clientY - rect.top) / rect.height);
});
dom.hero.addEventListener('pointerleave', () => gsap.to(material.uniforms.uPointer.value, { x: .5, y: .5, duration: 1.2, ease: 'power2.out' }));
dom.hero.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button, a')) return;
  dragStartX = event.clientX;
  dom.hero.classList.add('is-dragging');
  dom.hero.setPointerCapture?.(event.pointerId);
});
dom.hero.addEventListener('pointerup', (event) => {
  if (dragStartX !== null && Math.abs(event.clientX - dragStartX) > 55) travel(event.clientX < dragStartX ? 1 : -1);
  dragStartX = null;
  dom.hero.classList.remove('is-dragging');
});
dom.hero.addEventListener('pointercancel', () => { dragStartX = null; dom.hero.classList.remove('is-dragging'); });
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
  if (document.activeElement?.matches('input, textarea')) return;
  if (event.key === 'ArrowRight') travel(1);
  if (event.key === 'ArrowLeft') travel(-1);
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});
