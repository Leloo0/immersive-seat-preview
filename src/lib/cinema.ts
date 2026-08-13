/**
 * cinema.ts — porte TypeScript da mesma matemática de `python_app/cinema.py`.
 * Mantido em paridade 1:1 para que a prévia React e o app Flask mostrem
 * exatamente os mesmos números.
 */

export type Room = {
  slug: string;
  name: string;
  tagline: string;
  screenWidth: number;
  screenHeight: number;
  firstRowDistance: number;
  rowDepth: number;
  rowRise: number;
  rows: number;
  seatsPerRow: number;
  seatWidth: number;
  wrapAngle: number;
  sidePanels: boolean;
  idealFov: number;
};

export type SeatView = {
  row: number;
  seat: number;
  rowLabel: string;
  seatLabel: number;
  distance: number;
  hFov: number;
  totalFov: number;
  headTilt: number;
  offAxis: number;
  score: number;
  headline: string;
  detail: string;
  note: string;
};

export const ROOMS: Room[] = [
  {
    slug: "imax",
    name: "IMAX Laser",
    tagline: "Tela de 26 m parede-a-parede, proporção 1.43:1",
    screenWidth: 26, screenHeight: 18.2,
    firstRowDistance: 9, rowDepth: 1.25, rowRise: 0.42,
    rows: 10, seatsPerRow: 14, seatWidth: 0.62,
    wrapAngle: 0, sidePanels: false, idealFov: 62,
  },
  {
    slug: "screenx",
    name: "ScreenX 270°",
    tagline: "Projeção que invade as duas paredes laterais",
    screenWidth: 18, screenHeight: 8,
    firstRowDistance: 8, rowDepth: 1.2, rowRise: 0.38,
    rows: 10, seatsPerRow: 14, seatWidth: 0.6,
    wrapAngle: 130, sidePanels: true, idealFov: 55,
  },
  {
    slug: "standard",
    name: "Sala Standard 2D",
    tagline: "Referência clássica, tela 14 m em 2.39:1",
    screenWidth: 14, screenHeight: 5.9,
    firstRowDistance: 7.5, rowDepth: 1.1, rowRise: 0.3,
    rows: 10, seatsPerRow: 14, seatWidth: 0.58,
    wrapAngle: 0, sidePanels: false, idealFov: 42,
  },
];

const deg = (rad: number) => (rad * 180) / Math.PI;
const r1 = (n: number) => Math.round(n * 10) / 10;

function score(hFov: number, tilt: number, off: number, ideal: number) {
  const fovPenalty = Math.abs(hFov - ideal) * (hFov > ideal ? 1.5 : 1.1);
  const tiltPenalty = Math.max(0, tilt - 15) * 2.2;
  const axisPenalty = Math.max(0, Math.abs(off) - 12) * 1.6;
  return Math.max(0, Math.min(100, Math.round(100 - fovPenalty - tiltPenalty - axisPenalty)));
}

function verdict(hFov: number, tilt: number, off: number) {
  let headline: string, detail: string;
  if (hFov > 78) {
    headline = "Imersão extrema";
    detail = "A tela ultrapassa o campo de visão confortável: você sente a cena ao redor, mas precisa varrer os olhos para acompanhar.";
  } else if (hFov > 55) {
    headline = "Imersão alta";
    detail = "A tela preenche quase todo o campo de visão central. É a faixa preferida para IMAX e ScreenX.";
  } else if (hFov > 38) {
    headline = "Equilíbrio de referência";
    detail = "Enquadramento próximo do padrão de estúdio: nada escapa do olhar e a legenda fica sempre confortável.";
  } else {
    headline = "Visão panorâmica";
    detail = "A tela cabe inteira no olhar sem esforço, porém a sensação de escala se perde um pouco.";
  }
  const notes: string[] = [];
  if (tilt > 18) notes.push("pescoço bastante inclinado para cima");
  if (Math.abs(off) > 18) notes.push("imagem visivelmente trapezoidal pelo ângulo lateral");
  if (!notes.length) notes.push("geometria estável, sem distorção perceptível");
  return { headline, detail, note: notes.join("; ") };
}

/** Analisa um assento da sala e devolve as métricas perceptuais. */
export function analyze(room: Room, row: number, seat: number): SeatView {
  const center = (room.seatsPerRow - 1) / 2;
  const x = (seat - center) * room.seatWidth;
  const y = row * room.rowRise;
  const z = room.firstRowDistance + row * room.rowDepth;

  const screenCenterH = room.screenHeight / 2 + 1.2;
  const eyeH = 1.15 + y;
  const distance = Math.sqrt(x * x + z * z + (screenCenterH - eyeH) ** 2);

  const hFov = deg(2 * Math.atan(room.screenWidth / 2 / z));
  const totalFov = Math.min(hFov + room.wrapAngle, 300);
  const headTilt = deg(Math.atan((screenCenterH - eyeH) / z));
  const offAxis = deg(Math.atan(x / z));

  return {
    row, seat,
    rowLabel: String.fromCharCode(65 + row),
    seatLabel: seat + 1,
    distance: r1(distance),
    hFov: r1(hFov),
    totalFov: r1(totalFov),
    headTilt: r1(headTilt),
    offAxis: r1(offAxis),
    score: score(hFov, headTilt, offAxis, room.idealFov),
    ...verdict(hFov, headTilt, offAxis),
  };
}

/** Malha completa de assentos analisados. */
export function buildGrid(room: Room): SeatView[][] {
  return Array.from({ length: room.rows }, (_, r) =>
    Array.from({ length: room.seatsPerRow }, (_, s) => analyze(room, r, s)),
  );
}

/** Assento de maior nota de imersão da sala. */
export function bestSeat(grid: SeatView[][]): SeatView {
  return grid.flat().reduce((a, b) => (b.score > a.score ? b : a));
}