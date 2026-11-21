import { writeFileSync } from 'node:fs'
import data from '@iconify-json/game-icons/icons.json' with { type: 'json' }

/** Un dibujo por idea. Sin la misma figura con un badge o un trazo de más. */
const nombres = [
  'police-officer-head', 'swordman', 'spy', 'female', 'male', 'nurse-female', 'chef-toque',
  'flamethrower-soldier', 'ninja-head', 'baby-face',
  'shirt', 'trousers', 'boots', 'steeltoe-boots', 'gloves', 'billed-cap', 'outback-hat',
  'tie', 'bow-tie', 'dress', 'skirt', 'sandal', 'running-shoe', 'socks', 'sunglasses',
  'protection-glasses', 'kevlar-vest', 'armor-vest', 'helmet', 'gas-mask', 'night-vision',
  'riot-shield', 'life-jacket', 'backpack', 'duffel-bag', 'suitcase',
  'crossed-swords', 'pistol-gun', 'ak47', 'rifle', 'shotgun', 'bowie-knife', 'baton', 'bat',
  'handcuffs', 'shield', 'police-badge', 'whistle', 'cctv-camera', 'siren', 'walkie-talkie',
  'flashlight', 'binoculars', 'crosshair', 'metal-detector', 'security-gate', 'turnstile',
  'padlock', 'key', 'fire-extinguisher', 'traffic-cone', 'barrier', 'guarded-tower', 'police-car',
  'jeep', 'ambulance', 'truck', 'bus', 'airplane', 'helicopter', 'forklift', 'bulldozer',
  'tow-truck', 'sailboat', 'anchor', 'parachute', 'dutch-bike', 'car-key', 'delivery-drone',
  'house', 'castle', 'factory', 'warehouse', 'hospital', 'church', 'bank', 'shop',
  'brick-wall', 'door', 'wooden-fence', 'road', 'compass',
  'wrench', 'screwdriver', 'toolbox', 'claw-hammer', 'fire-axe', 'hand-saw', 'drill', 'screw',
  'paint-roller', 'broom', 'spray', 'vacuum-cleaner', 'ladder', 'crane', 'kitchen-scale',
  'contract', 'calendar', 'id-card', 'passport', 'full-folder', 'fountain-pen', 'pencil-ruler',
  'cash', 'coins', 'money-stack', 'medal', 'megaphone', 'envelope', 'phone', 'smartphone',
  'laptop', 'tablet', 'microphone', 'speaker', 'calculator', 'abacus', 'chart', 'stopwatch',
  'hourglass', 'ringing-bell', 'alarm-clock',
  'first-aid-kit', 'stethoscope', 'pill', 'syringe', 'medical-pack', 'coffee-cup', 'bread',
  'water-bottle', 'cooking-pot', 'shiny-apple', 'campfire',
  'sun', 'fire', 'heavy-rain', 'fluffy-cloud', 'lightning-arc', 'snowflake-1', 'umbrella',
  'pine-tree', 'flower-pot', 'mountains', 'palm-tree',
  'jumping-dog', 'sitting-dog', 'cat', 'snake', 'bee', 'cow', 'pig', 'chicken', 'sheep',
  'rabbit', 'mouse', 'lion', 'owl', 'crab', 'wolf-head', 'horse-head', 'ghost',
  'light-bulb', 'desk-lamp', 'plug', 'car-battery', 'wifi-router', 'oil-drum', 'jerrycan',
  'fuel-tank', 'cardboard-box', 'wooden-crate', 'recycle', 'weight', 'photo-camera',
  'video-camera', 'film-projector', 'trash-can', 'radio-tower', 'satellite', 'radar-dish',
  'dog-bowl', 'safety-pin', 'watch', 'ring', 'necklace', 'tooth', 'mustache', 'beard',
  'crown', '3d-glasses',
]

const unicos = [...new Set(nombres)]
const faltan = unicos.filter((nombre) => !data.icons[nombre])
if (faltan.length) {
  console.error('Faltan:', faltan.join(', '))
  process.exit(1)
}

const icons = {}
for (const nombre of unicos.sort((a, b) => a.localeCompare(b))) {
  icons[nombre] = { body: data.icons[nombre].body }
}

const salida = {
  prefix: 'game-icons',
  width: data.width ?? 512,
  height: data.height ?? 512,
  icons,
}

writeFileSync('src/lib/iconos-dibujo.json', JSON.stringify(salida))
console.log('iconos', unicos.length)
