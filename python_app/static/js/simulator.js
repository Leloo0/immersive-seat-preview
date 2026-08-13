/**
 * simulator.js
 * ------------
 * Camada de apresentação: pega os números já calculados no Python e
 * traduz em variáveis CSS da cena 3D + textos do painel de análise.
 *
 * Nenhum framework, nenhuma dependência. Toda a malha de assentos chega
 * embutida no HTML (#bootstrap), então trocar de assento é instantâneo.
 */
(() => {
  "use strict";

  const boot = JSON.parse(document.getElementById("bootstrap").textContent);
  let state = { room: boot.room, grid: boot.grid, current: boot.best };

  const stage = document.getElementById("stage");
  const seatmap = document.getElementById("seatmap");
  const $ = (id) => document.getElementById(id);

  /** Converte a análise de um assento nas variáveis CSS do palco. */
  function paintStage(view) {
    // Escala: quanto mais perto, maior a tela. Normalizada pela 5ª fileira.
    const scale = Math.min(2.2, 26 / view.distance);
    stage.style.setProperty("--scale", scale.toFixed(3));
    // Assento fora do eixo => a cabeça vira; invertemos o sinal porque
    // girar a cena para a direita simula olhar para a esquerda.
    stage.style.setProperty("--yaw", (-view.off_axis * 0.6).toFixed(2) + "deg");
    // Olhar para cima nas fileiras da frente.
    stage.style.setProperty("--pitch", (view.head_tilt * 0.35).toFixed(2) + "deg");
    // Abertura das paredes: cresce com a proximidade nas salas ScreenX.
    const wrap = state.room.side_panels ? 52 + Math.min(22, 180 / view.distance) : 74;
    stage.style.setProperty("--wrap", wrap.toFixed(1) + "deg");
  }

  /** Atualiza HUD, textos e métricas. */
  function paintPanel(view) {
    $("hudSeat").textContent = `Fileira ${view.row_label} · Poltrona ${view.seat_label}`;
    $("hudFov").textContent = `${view.total_fov}° de campo de visão`;
    $("headline").textContent = view.headline;
    $("detail").textContent = view.detail;
    $("note").textContent = view.note;
    $("scoreValue").textContent = view.score;
    $("scoreFill").style.width = view.score + "%";
    $("mDistance").textContent = view.distance + " m";
    $("mFov").textContent = view.total_fov + "°";
    $("mTilt").textContent = view.head_tilt + "°";
    $("mAxis").textContent = view.off_axis + "°";
  }

  function select(row, seat) {
    const view = state.grid[row][seat];
    state.current = view;
    seatmap.querySelectorAll(".seat.is-selected")
      .forEach((el) => el.classList.remove("is-selected"));
    const el = seatmap.querySelector(`.seat[data-row="${row}"][data-seat="${seat}"]`);
    if (el) el.classList.add("is-selected");
    paintStage(view);
    paintPanel(view);
  }

  /* -------- interações -------- */
  seatmap.addEventListener("click", (e) => {
    const btn = e.target.closest(".seat");
    if (btn) select(+btn.dataset.row, +btn.dataset.seat);
  });

  // "Olhar" para os lados: apenas um nudge visual sobre o yaw calculado.
  let peek = 0;
  const nudge = (delta) => {
    peek = Math.max(-32, Math.min(32, peek + delta));
    const base = -state.current.off_axis * 0.6;
    stage.style.setProperty("--yaw", (base + peek).toFixed(2) + "deg");
  };
  $("lookLeft").addEventListener("click", () => nudge(-12));
  $("lookRight").addEventListener("click", () => nudge(12));
  $("toggleFilm").addEventListener("click", () => stage.classList.toggle("is-playing"));

  // Navegação por teclado dentro do mapa de assentos.
  document.addEventListener("keydown", (e) => {
    const { row, seat } = state.current;
    const maxRow = state.grid.length - 1;
    const maxSeat = state.grid[0].length - 1;
    const moves = {
      ArrowUp: [Math.max(0, row - 1), seat],
      ArrowDown: [Math.min(maxRow, row + 1), seat],
      ArrowLeft: [row, Math.max(0, seat - 1)],
      ArrowRight: [row, Math.min(maxSeat, seat + 1)],
    };
    if (moves[e.key]) { e.preventDefault(); select(...moves[e.key]); }
  });

  // Primeiro render (o HTML já veio pintado pelo Flask; aqui só a cena 3D).
  paintStage(state.current);
})();