import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";

import { ROOMS, buildGrid, bestSeat, type SeatView } from "@/lib/cinema";
import screenContent from "@/assets/screen-content.jpg";
import sideWall from "@/assets/side-wall.jpg";
import auditorium from "@/assets/auditorium.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulador de Assento 3D | CINE ROUGE" },
      {
        name: "description",
        content:
          "Veja em 3D como a tela é enxergada de cada fileira antes de comprar: IMAX, ScreenX 270° e sala standard.",
      },
      { property: "og:title", content: "Simulador de Assento 3D | CINE ROUGE" },
      {
        property: "og:description",
        content:
          "Preview sensorial da sala: campo de visão, ângulo e imersão calculados para cada poltrona.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [slug, setSlug] = useState(ROOMS[0]!.slug);
  const [playing, setPlaying] = useState(false);
  const [peek, setPeek] = useState(0);

  const room = useMemo(() => ROOMS.find((r) => r.slug === slug)!, [slug]);
  const grid = useMemo(() => buildGrid(room), [room]);

  // Assento atual: começa no de maior nota da sala escolhida.
  const [seatRef, setSeatRef] = useState<{ row: number; seat: number } | null>(null);
  const view: SeatView = seatRef ? grid[seatRef.row]![seatRef.seat]! : bestSeat(grid);

  const pick = useCallback((row: number, seat: number) => {
    setSeatRef({ row, seat });
    setPeek(0);
  }, []);

  // Números perceptuais -> variáveis CSS da cena 3D.
  const stageVars = {
    "--scale": Math.min(2.2, 26 / view.distance).toFixed(3),
    "--yaw": `${(-view.offAxis * 0.6 + peek).toFixed(2)}deg`,
    "--pitch": `${(view.headTilt * 0.35).toFixed(2)}deg`,
    "--wrap": room.sidePanels
      ? `${(52 + Math.min(22, 180 / view.distance)).toFixed(1)}deg`
      : "74deg",
  } as React.CSSProperties;

  const sideImage = room.sidePanels ? screenContent : sideWall;

  return (
    <div className="cine-root">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4 sm:px-8"
        style={{ borderColor: "var(--cine-line)" }}>
        <span className="text-xl font-extrabold tracking-[0.28em]">
          CINE<span style={{ color: "var(--cine-red-bright)" }}>ROUGE</span>
        </span>
        <nav className="flex flex-wrap gap-2" aria-label="Formato de sala">
          {ROOMS.map((r) => (
            <button
              key={r.slug}
              type="button"
              className="cine-pill"
              data-active={r.slug === slug}
              onClick={() => {
                setSlug(r.slug);
                setSeatRef(null);
                setPeek(0);
              }}
            >
              {r.name}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto grid max-w-[1500px] items-start gap-6 p-4 sm:p-8 lg:grid-cols-[1.6fr_0.9fr]">
        {/* ---------- palco 3D ---------- */}
        <section className="grid gap-3">
          <div
            className="cine-stage"
            style={stageVars}
            data-side-panels={room.sidePanels ? "on" : "off"}
            data-playing={playing}
          >
            <div className="cine-world">
              <div
                className="cine-panel cine-panel-side cine-panel-left"
                style={{ backgroundImage: `url(${sideImage})` }}
                aria-hidden="true"
              />
              <div
                className="cine-panel cine-panel-center"
                style={{ backgroundImage: `url(${screenContent})` }}
                role="img"
                aria-label="Prévia da tela vista do assento selecionado"
              />
              <div
                className="cine-panel cine-panel-side cine-panel-right"
                style={{ backgroundImage: `url(${sideImage})` }}
                aria-hidden="true"
              />
            </div>
            <div
              className="cine-foreground"
              style={{ backgroundImage: `url(${auditorium})` }}
              aria-hidden="true"
            />
            <div className="absolute left-4 top-3 grid gap-1 text-[0.7rem] uppercase tracking-[0.16em]">
              <span className="font-bold" style={{ color: "var(--cine-red-bright)" }}>
                Fileira {view.rowLabel} · Poltrona {view.seatLabel}
              </span>
              <span style={{ color: "var(--cine-ash-dim)" }}>
                {view.totalFov}° de campo de visão
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-2">
            <button type="button" className="cine-pill"
              onClick={() => setPeek((p) => Math.max(-32, p - 12))}>◀ olhar</button>
            <button type="button" className="cine-pill" data-active={playing}
              onClick={() => setPlaying((p) => !p)}>▶ rodar cena</button>
            <button type="button" className="cine-pill"
              onClick={() => setPeek((p) => Math.min(32, p + 12))}>olhar ▶</button>
          </div>
        </section>

        {/* ---------- painel de análise ---------- */}
        <section
          aria-live="polite"
          className="grid gap-3 rounded-2xl border p-5"
          style={{
            borderColor: "var(--cine-line)",
            background:
              "linear-gradient(160deg, var(--cine-black-3), var(--cine-black-2) 60%)",
          }}
        >
          <h1 className="text-3xl font-bold">{room.name}</h1>
          <p className="text-sm" style={{ color: "var(--cine-ash-dim)" }}>{room.tagline}</p>
          <p className="text-lg font-bold tracking-wide" style={{ color: "var(--cine-red-bright)" }}>
            {view.headline}
          </p>
          <p className="text-sm leading-relaxed">{view.detail}</p>

          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--cine-ash-dim)" }}>
            <div className="cine-scorebar h-1.5 flex-1 overflow-hidden rounded-full"
              style={{ background: "var(--cine-black-3)" }}>
              <i style={{ width: `${view.score}%` }} />
            </div>
            <strong className="text-xl" style={{ color: "var(--cine-ash)" }}>{view.score}</strong>
            <span>/100 imersão</span>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            {[
              ["Distância", `${view.distance} m`],
              ["Campo de visão", `${view.totalFov}°`],
              ["Ângulo vertical", `${view.headTilt}°`],
              ["Desvio lateral", `${view.offAxis}°`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border px-3 py-2"
                style={{ borderColor: "var(--cine-line)", background: "oklch(0.55 0.23 27 / 0.05)" }}>
                <dt className="text-[0.62rem] uppercase tracking-[0.16em]"
                  style={{ color: "var(--cine-ash-dim)" }}>{label}</dt>
                <dd className="mt-0.5 text-lg">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs italic" style={{ color: "var(--cine-ash-dim)" }}>{view.note}</p>
        </section>

        {/* ---------- mapa de assentos ---------- */}
        <section className="lg:col-span-2">
          <div className="cine-screen-hint mx-auto mb-6 max-w-[620px] pb-2 text-center text-[0.7rem] tracking-[0.6em]"
            style={{ color: "var(--cine-red-bright)" }}>
            TELA
          </div>
          <div className="grid justify-center gap-1.5">
            {grid.map((row) => (
              <div key={row[0]!.rowLabel} className="flex items-center justify-center gap-1.5">
                <span className="w-5 text-center text-[0.7rem]"
                  style={{ color: "var(--cine-ash-dim)" }}>{row[0]!.rowLabel}</span>
                {row.map((s) => (
                  <button
                    key={s.seat}
                    type="button"
                    className="cine-seat"
                    style={{ "--heat": s.score } as React.CSSProperties}
                    data-selected={s.row === view.row && s.seat === view.seat}
                    onClick={() => pick(s.row, s.seat)}
                    aria-label={`Fileira ${s.rowLabel} poltrona ${s.seatLabel}, imersão ${s.score}`}
                  />
                ))}
                <span className="w-5 text-center text-[0.7rem]"
                  style={{ color: "var(--cine-ash-dim)" }}>{row[0]!.rowLabel}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-4 text-xs"
            style={{ color: "var(--cine-ash-dim)" }}>
            <span>menos imersivo → assento de referência</span>
          </p>
        </section>
      </main>
    </div>
  );
}
