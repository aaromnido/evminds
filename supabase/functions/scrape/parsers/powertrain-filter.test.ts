/**
 * Regression tests for the powertrain filter.
 *
 * Fixture "discard": REAL articles from the evminds database that were
 * archived because they are about non-BEV powertrains (hybrids, PHEV,
 * EREV, ICE). Sourced via query against `articles WHERE archived = true`.
 *
 * Fixture "keep": legitimate BEV articles that must pass through
 * (return true). Includes sentinel cases for:
 *  - Ambiguous terms excluded from the blacklist ("rango extendido", "Extended Range")
 *  - Word-boundary matching ("Chevrolet"/"Chevy" must NOT match "hev"; "MPGe" must NOT match "mpg")
 *  - "efuel" boundary ("refueling" must NOT match "efuel")
 *  - Electric consumption "kWh/100 km" (must NOT match "l/100 km")
 *  - Stealth non-BEV cases whose text lacks powertrain terms: the keyword
 *    layer MUST let them pass; the AI layer (Fase 2) catches them.
 */

import { assertEquals } from 'jsr:@std/assert@1/equals';
import { excludedPowertrainMatch, isNotExcludedPowertrain } from './powertrain-filter.ts';

// ─── DISCARD fixtures (REAL archived articles from the DB) ─────────
// Each entry: [title, excerpt]
const DISCARD: [string, string][] = [
  // ── PHEV (boundary: "phev") ──
  [
    'Nuevo PHEV de GM de 6 plazas y 1.255 km de autonomía, con claro enfoque en Norteamérica',
    'GM cree que su nuevo SUV PHEV Starlight L podría ser el híbrido con mejor relación calidad-precio de China',
  ],
  [
    'BMW retira 30.000 PHEV y pide a los propietarios que aparquen al aire libre, pero no es por la batería',
    'Existe riesgo de incendio y está relacionado con uno de los componentes del motor de combustión.',
  ],
  [
    'BYD asalta el mercado europeo de pick-ups con el imponente Shark, un 4x4 con motor PHEV de 436 CV que hace 90 km sin gastar gasolina',
    'BYD anuncia su entrada en el mercado europeo de pick-ups con un imponente 4x4 híbrido enchufable.',
  ],
  [
    'Tamaño de EBRO S700 y barato como el BYD Atto 2, este nuevo SUV rompe el mercado de híbridos PHEV con un precio imbatible',
    'Es igual de grande que un EBRO S700 y tan barato como un BYD Atto 2.',
  ],

  // ── REEV (boundary: "reev") ──
  [
    'Xpeng presenta el nuevo L03, el SUV Coupé de un ex de Ferrari que dice adiós a la ansiedad por la autonomía',
    'Llega el nuevo Xpeng L03. Un SUV Coupé eléctrico diseñado por un ex de la casa Ferrari que dice adiós a la ansiedad por la autonomía gracias a la tecnología REEV.',
  ],

  // ── EREV (boundary: "erev") ──
  [
    'El SkyNomad N90 es el vehículo de aventura de Xiaomi con motor de combustión',
    'El SkyNomad N90 es el primer EREV de Xiaomi, y es un SUV familiar para viajes por carretera.',
  ],

  // ── híbrido enchufable (includes) ──
  [
    'Morro de Porsche 911 y hasta 1.000 kilómetros de autonomía en versión híbrido enchufable: el Ora 5 llega dispuesto a arrasar',
    'La marca GWM lanzará su SUV en algunos países de Europa para competir en un segmento muy disputado.',
  ],
  [
    'Tras probar el híbrido enchufable más barato de EBRO tengo muy claro que todo el mundo tiene acceso a la etiqueta CERO',
    'Ponemos a prueba el híbrido enchufable más barato de EBRO, el interesantísimo s700.',
  ],
  [
    'Denza entra en el segmento SUV con el Bao 5, una bestia de 544 CV y capacidad 4x4 para hacerte olvidar al Land Rover Defender',
    'Denza, la marca premium de BYD, anuncia su entrada en el segmento SUV europeo con una bestia que no le teme al todoterreno. Llega el nuevo Denza Bao 5 con un motor híbrido enchufable.',
  ],
  [
    'Con 1.128 CV y 350 km de autonomía eléctrica, Geely presenta el Defender híbrido que Land Rover no ha podido hacer',
    'Geely ha anunciado que el Galaxy Cruiser 700 llegará a Europa en cuestión de meses.',
  ],
  [
    'Desde 23.740 euros y con hasta 1.000 km de autonomía: así es el híbrido enchufable más vendido en España en junio',
    'El nuevo SUV híbrido enchufable de BYD supera al Seal U.',
  ],

  // ── híbrido (includes, standalone) ──
  [
    'El tercer coche de la \'marca china más querida\' ya es una realidad: un SUV híbrido "inteligente y espacioso" con 1500 km de autonomía',
    'La marca china ha mostrado el primer adelanto oficial de su futuro SUV eléctrico de autonomía extendida.',
  ],

  // ── hybrid (includes) ──
  [
    'BYD launches 2026 Sealion 06 DM-i to strengthen plug-in hybrid lineup',
    'The 2026 Sealion 06 DM-i SUV starts at 129,900 yuan, featuring a combined range of up to 1,845 kilometers.',
  ],

  // ── l/100 km (includes) ──
  [
    'Sólo 1,0 L/100 km y cuesta 15.000 €: Chery (OMODA) desata la locura con su híbrido de 1.400 km de autonomía',
    '18.073 ventas en 3 días. El último híbrido enchufable del Grupo Chery ha batido récords por su bajísimo precio.',
  ],
  [
    '2,6 L/100 km y etiqueta CERO: probamos el nuevo Peugeot 408 que supera a cualquier SUV',
    'Peugeot actualiza su rompedora berlina con más tecnología. Su nueva versión híbrida enchufable de 240 CV.',
  ],
  [
    'Gasta menos que mechero, tiene la etiqueta ECO y solo cuesta 11.200 €: la nueva berlina de Geely que podría llegar a España',
    'Geely ha presentado la berlina híbrida definitiva. Ostenta el récord mundial al coche más eficiente con solo 2,22 l/100 km.',
  ],
  [
    'Arrasó con 480.000 ventas en 1 año y ahora BYD actualiza este sedán eléctrico que gasta 3,6 L/100 km y cuesta 9.500€',
    'La marca china ya ha dejado al descubierto la nueva generación del Qin Plus.',
  ],

  // ── MPG (boundary) ──
  [
    'Este sencillo truco disparó la economía de combustible de mi híbrido enchufable a 50 MPG',
    'La economía de combustible de mi Volvo familiar ya era excelente de por sí.',
  ],
];

// ─── KEEP fixtures ─────────────────────────────────────────────────
const KEEP: [string, string][] = [
  // ── Pure BEV (general) ──
  ['Tesla Model 3 Highland: precio y especificaciones en España', 'El sedán eléctrico más vendido del mundo llega con facelift'],
  ['BYD Seal U: el SUV eléctrico chino que apunta a lo alto', 'Con batería Blade de 87 kWh y 500 km de autonomía'],
  ['MG4: el eléctrico que está cambiando el mercado', 'El hatchback eléctrico parte de 25.000 euros'],
  ['Skoda Enyaq Coupé: el eléctrico más practicado de Skoda', 'Con hasta 560 km de autonomía WLTP'],
  ['Hyundai Ioniq 5 N: el deportivo eléctrico de 650 CV', 'El hot hatch eléctrico más potente de la historia'],
  ['BMW iX1: el SUV eléctrico compacto de BMW', 'Con motor eléctrico de 204 CV y 440 km de autonomía'],
  ['Cupra Born VZ: el eléctrico deportivo con 325 CV', 'La versión más potente del Born'],
  ['Renault 5 E-Tech: el eléctrico retro que conquista Europa', "El iconico modelo renace como BEV"],

  // ── SENTINEL: Mustang Mach-E "batería de rango extendido" ──
  [
    'Ford Mustang Mach-E: la versión de batería de rango extendido ya está disponible',
    'Ford amplía la oferta del Mach-E con la batería de rango extendido de 91 kWh',
  ],

  // ── SENTINEL: F-150 Lightning "Extended Range" ──
  [
    'Ford F-150 Lightning Extended Range: 515 km de autonomía con batería de 131 kWh',
    'La versión Extended Range del Lightning llega con la mayor batería de Ford',
  ],

  // ── SENTINEL: Chevrolet Bolt (must NOT match "hev" substring) ──
  [
    'Chevrolet Bolt EV 2025: el eléctrico más asequible de EE.UU.',
    'El Chevy Bolt vuelve con batería renovada y 400 km de autonomía',
  ],

  // ── SENTINEL: article with "MPGe" (must NOT match "mpg") ──
  [
    'Tesla Model Y alcanza los 127 MPGe en prueba EPA',
    'El crossover eléctrico de Tesla establece un nuevo récord de eficiencia con 127 MPGe en ciudad',
  ],

  // ── SENTINEL: "refueling" must NOT match "efuel" ──
  [
    'BYD turned its luxury EV into a Swiss auto piece of jewelry, and it sold for a record $800,000+',
    'The Denza Z9 GT Chopard Edition is infused with gold accents, rare gemstones, and BYD\'s new Flash Charging system, enabling it to recharge as quickly as refueling.',
  ],

  // ── SENTINEL: electric consumption "kWh/100 km" (must NOT match "l/100 km") ──
  [
    'Renault Scenic E-Tech: consumo real de 15 kWh/100 km',
    'El SUV eléctrico se queda en 15 kWh/100 km en ciclo mixto',
  ],

  // ── SENTINEL: stealth non-BEV cases (no powertrain mention in text). ──
  // The keyword layer CANNOT catch these and must let them pass; archiving
  // them is the AI layer's job (Fase 2). Do NOT move them to DISCARD.
  ['Xpeng L03: la nueva berlina china llega con 600 km de autonomía', 'La marca presenta su sedán más eficiente hasta la fecha'],
  ['Denza Bao 5: el todoterreno de lujo de BYD arrasa en China', 'El SUV premium suma 10.000 pedidos en una semana'],
  ['Xiaomi SkyNomad: la sorpresa de Xiaomi para 2027', 'La tecnológica amplía su gama con un nuevo modelo'],

  // ── BEV without powertrain mention (should pass) ──
  ['Nuevos puntos de carga ultra-rápidos en la AP-7', 'La red de electrolineras se amplía con 150 kW'],
  ['Ionity sube los precios de carga para usuarios no suscritos', 'La tarifa por kWh aumenta un 20%'],
];

Deno.test('discard: non-BEV articles are rejected', () => {
  for (const [title, excerpt] of DISCARD) {
    const result = isNotExcludedPowertrain(title, excerpt);
    assertEquals(
      result,
      false,
      `Expected DISCARD but kept: "${title}"`,
    );
  }
});

Deno.test('keep: BEV articles pass through', () => {
  for (const [title, excerpt] of KEEP) {
    const result = isNotExcludedPowertrain(title, excerpt);
    assertEquals(
      result,
      true,
      `Expected KEEP but discarded: "${title}"`,
    );
  }
});

Deno.test('sentinel: Mustang Mach-E "bateria de rango extendido" passes', () => {
  const result = isNotExcludedPowertrain(
    'Ford Mustang Mach-E: la version de bateria de rango extendido ya esta disponible',
    'Ford amplia la oferta del Mach-E con la bateria de rango extendido de 91 kWh',
  );
  assertEquals(result, true);
});

Deno.test('sentinel: F-150 Lightning "Extended Range" passes', () => {
  const result = isNotExcludedPowertrain(
    'Ford F-150 Lightning Extended Range: 515 km de autonomia con bateria de 131 kWh',
    'La version Extended Range del Lightning llega con la mayor bateria de Ford',
  );
  assertEquals(result, true);
});

Deno.test('sentinel: Chevrolet Bolt passes (hev word boundary)', () => {
  const result = isNotExcludedPowertrain(
    'Chevrolet Bolt EV 2025: el electrico mas asequible de EE.UU.',
    'El Chevy Bolt vuelve con bateria renovada y 400 km de autonomia',
  );
  assertEquals(result, true);
});

Deno.test('sentinel: MPGe article passes (mpg word boundary)', () => {
  const result = isNotExcludedPowertrain(
    'Tesla Model Y alcanza los 127 MPGe en prueba EPA',
    'El crossover electrico de Tesla establece un nuevo record de eficiencia con 127 MPGe en ciudad',
  );
  assertEquals(result, true);
});

Deno.test('sentinel: "refueling" does not trigger efuel boundary', () => {
  const result = isNotExcludedPowertrain(
    'BYD turned its luxury EV into a Swiss auto piece of jewelry, and it sold for a record $800,000+',
    "The Denza Z9 GT Chopard Edition is infused with gold accents, rare gemstones, and BYD's new Flash Charging system, enabling it to recharge as quickly as refueling.",
  );
  assertEquals(result, true);
});

Deno.test('edge case: "hevrolet" does not trigger hev boundary', () => {
  assertEquals(isNotExcludedPowertrain('He vendido un Chevrolet Bolt', ''), true);
  assertEquals(isNotExcludedPowertrain('Mi Chevy es electrico', ''), true);
});

Deno.test('edge case: standalone "mpg" is discarded but "mpge" is kept', () => {
  assertEquals(isNotExcludedPowertrain('El coche gasta 30 mpg', ''), false);
  assertEquals(isNotExcludedPowertrain('El coche logra 120 MPGe', ''), true);
});

Deno.test('edge case: "mhev" boundary', () => {
  assertEquals(isNotExcludedPowertrain('Nuevo MHEV de Audi', ''), false);
  assertEquals(isNotExcludedPowertrain('Audi lanza su modelo mild hybrid', ''), false);
});

Deno.test('edge case: "l/100 km" and "l/100km" (with and without space)', () => {
  assertEquals(isNotExcludedPowertrain('Consumo de 5,2 l/100 km', ''), false);
  assertEquals(isNotExcludedPowertrain('Consumo de 5,2 l/100km', ''), false);
});

Deno.test('edge case: plural acronyms are discarded (PHEVs, EREVs, HEVs)', () => {
  assertEquals(isNotExcludedPowertrain('Las ventas de PHEVs crecen un 40%', ''), false);
  assertEquals(isNotExcludedPowertrain('Los EREVs conquistan el mercado chino', ''), false);
  assertEquals(isNotExcludedPowertrain('Los HEVs dominan las ventas de Toyota', ''), false);
});

Deno.test('edge case: NBSP around units is normalized before matching', () => {
  assertEquals(isNotExcludedPowertrain('Consumo de 3,6\u00a0l/100\u00a0km', ''), false);
});

Deno.test('sentinel: electric consumption "15 kWh/100 km" passes', () => {
  assertEquals(
    isNotExcludedPowertrain('Renault Scenic E-Tech: consumo real de 15 kWh/100 km', ''),
    true,
  );
});

Deno.test('sentinel: stealth non-BEV cases pass the keyword layer (AI catches them)', () => {
  assertEquals(isNotExcludedPowertrain('Xpeng L03: la nueva berlina china llega con 600 km de autonomía', ''), true);
  assertEquals(isNotExcludedPowertrain('Denza Bao 5: el todoterreno de lujo de BYD arrasa en China', ''), true);
  assertEquals(isNotExcludedPowertrain('Xiaomi SkyNomad: la sorpresa de Xiaomi para 2027', ''), true);
});

Deno.test('excludedPowertrainMatch returns the canonical matched term', () => {
  assertEquals(excludedPowertrainMatch('Las ventas de PHEVs crecen', ''), 'phev');
  assertEquals(excludedPowertrainMatch('Consumo de 5,2 l/100 km', ''), 'l/100 km');
  assertEquals(excludedPowertrainMatch('Tesla Model 3 Highland', 'El sedán eléctrico'), null);
});

Deno.test('edge case: "e-fuel" (with hyphen) is discarded', () => {
  assertEquals(isNotExcludedPowertrain('BMW y Shell prueban e-fuel en el Nurburgring', ''), false);
});

Deno.test('edge case: standalone "efuel" is discarded', () => {
  assertEquals(isNotExcludedPowertrain('El nuevo efuel promete revolucionar el mercado', ''), false);
});
