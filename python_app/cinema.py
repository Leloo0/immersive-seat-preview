"""
cinema.py
---------
Modelo de dados e toda a matemática do Simulador de Assento 3D.

A ideia: dado um formato de sala (IMAX, ScreenX, Standard) e um assento
(fileira + poltrona), calculamos como a tela é percebida daquele ponto:

  - ângulo horizontal de visão (FOV ocupado pela tela)
  - ângulo vertical (o quanto o espectador precisa "levantar a cabeça")
  - distância até a tela
  - desvio lateral (assentos fora do eixo central)
  - uma nota de imersão de 0 a 100

Esses números alimentam tanto a página HTML quanto o "palco" 3D em CSS,
que usa apenas transformações (perspective / rotateY / translateZ).
Nenhuma dependência externa além do Flask na camada web.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, asdict, field
from typing import Dict, List


# --------------------------------------------------------------------------- #
# Modelo da sala
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Room:
    """Descreve fisicamente uma sala de cinema (medidas em metros)."""

    slug: str
    name: str
    tagline: str
    screen_width: float          # largura da tela principal
    screen_height: float         # altura da tela principal
    first_row_distance: float    # distância da fileira A até a tela
    row_depth: float             # espaçamento entre fileiras
    row_rise: float              # ganho de altura (estádio) por fileira
    rows: int                    # nº de fileiras
    seats_per_row: int           # nº de poltronas por fileira
    seat_width: float            # largura de cada poltrona
    wrap_angle: float            # abertura extra das paredes laterais (graus)
    side_panels: bool            # projeta imagem nas laterais? (ScreenX)
    accent: str                  # cor de destaque do formato
    ideal_fov: float = 50.0      # FOV horizontal "perfeito" para o formato

    # ---- geometria por assento ------------------------------------------- #
    def seat_position(self, row: int, seat: int) -> Dict[str, float]:
        """Posição (x lateral, y altura, z profundidade) do assento em metros.

        row  -> índice 0..rows-1   (0 = primeira fileira, colada na tela)
        seat -> índice 0..seats_per_row-1 (0 = extrema esquerda)
        """
        center = (self.seats_per_row - 1) / 2
        return {
            "x": (seat - center) * self.seat_width,
            "y": row * self.row_rise,
            "z": self.first_row_distance + row * self.row_depth,
        }

    def analyze(self, row: int, seat: int) -> "SeatView":
        """Calcula todas as métricas perceptuais de um assento."""
        pos = self.seat_position(row, seat)
        x, y, z = pos["x"], pos["y"], pos["z"]

        # Distância real (Pitágoras em 3D) até o centro da tela.
        # A tela tem o centro a ~ (screen_height / 2 + 1.2 m) do chão.
        screen_center_h = self.screen_height / 2 + 1.2
        eye_h = 1.15 + y  # altura dos olhos sentado + elevação do estádio
        distance = math.sqrt(x * x + z * z + (screen_center_h - eye_h) ** 2)

        # Ângulo horizontal ocupado pela tela: 2 * atan((L/2) / z)
        h_fov = math.degrees(2 * math.atan((self.screen_width / 2) / z))
        # Com paredes laterais ativas (ScreenX) somamos a abertura extra.
        total_fov = min(h_fov + self.wrap_angle, 300.0)

        # Ângulo vertical ocupado e inclinação da cabeça (positivo = olhar p/ cima)
        v_fov = math.degrees(2 * math.atan((self.screen_height / 2) / z))
        head_tilt = math.degrees(math.atan((screen_center_h - eye_h) / z))

        # Desvio lateral em relação ao eixo central da sala.
        off_axis = math.degrees(math.atan(x / z))

        return SeatView(
            row=row,
            seat=seat,
            row_label=chr(ord("A") + row),
            seat_label=seat + 1,
            distance=round(distance, 1),
            h_fov=round(h_fov, 1),
            total_fov=round(total_fov, 1),
            v_fov=round(v_fov, 1),
            head_tilt=round(head_tilt, 1),
            off_axis=round(off_axis, 1),
            score=self._score(h_fov, head_tilt, off_axis, self.ideal_fov),
            **self._verdict(h_fov, head_tilt, off_axis),
        )

    # ---- heurísticas de qualidade ---------------------------------------- #
    @staticmethod
    def _score(h_fov: float, head_tilt: float, off_axis: float, ideal: float = 50.0) -> int:
        """Nota 0-100. Referência SMPTE/THX: ~50° de FOV é o ideal.

        Penalizamos telas grandes demais (fileiras da frente, cansaço visual),
        pequenas demais (fundo da sala), cabeça muito inclinada e desvio lateral.
        """
        fov_penalty = abs(h_fov - ideal) * (1.5 if h_fov > ideal else 1.1)
        tilt_penalty = max(0.0, head_tilt - 15.0) * 2.2
        axis_penalty = max(0.0, abs(off_axis) - 12.0) * 1.6
        return max(0, min(100, round(100 - fov_penalty - tilt_penalty - axis_penalty)))

    @staticmethod
    def _verdict(h_fov: float, head_tilt: float, off_axis: float) -> Dict[str, str]:
        """Texto amigável explicando a sensação naquele assento."""
        if h_fov > 78:
            headline = "Imersão extrema"
            detail = ("A tela ultrapassa o campo de visão confortável: você sente "
                      "a cena ao redor, mas precisa varrer os olhos para acompanhar.")
        elif h_fov > 55:
            headline = "Imersão alta"
            detail = ("A tela preenche quase todo o campo de visão central. "
                      "É a faixa preferida para IMAX e ScreenX.")
        elif h_fov > 38:
            headline = "Equilíbrio de referência"
            detail = ("Enquadramento próximo do padrão de estúdio: nada escapa "
                      "do olhar e a legenda fica sempre confortável.")
        else:
            headline = "Visão panorâmica"
            detail = ("A tela cabe inteira no olhar sem esforço, porém a sensação "
                      "de escala se perde um pouco.")

        notes: List[str] = []
        if head_tilt > 18:
            notes.append("pescoço bastante inclinado para cima")
        if abs(off_axis) > 18:
            notes.append("imagem visivelmente trapezoidal pelo ângulo lateral")
        if not notes:
            notes.append("geometria estável, sem distorção perceptível")

        return {"headline": headline, "detail": detail, "note": "; ".join(notes)}


@dataclass(frozen=True)
class SeatView:
    """Resultado da análise de um assento — serializável direto para JSON."""

    row: int
    seat: int
    row_label: str
    seat_label: int
    distance: float
    h_fov: float
    total_fov: float
    v_fov: float
    head_tilt: float
    off_axis: float
    score: int
    headline: str
    detail: str
    note: str

    def to_dict(self) -> Dict:
        return asdict(self)


# --------------------------------------------------------------------------- #
# Catálogo de salas
# --------------------------------------------------------------------------- #
ROOMS: Dict[str, Room] = {
    "imax": Room(
        slug="imax",
        name="IMAX Laser",
        tagline="Tela de 26 m parede-a-parede, proporção 1.43:1",
        screen_width=26.0, screen_height=18.2,
        first_row_distance=9.0, row_depth=1.25, row_rise=0.42,
        rows=10, seats_per_row=14, seat_width=0.62,
        wrap_angle=0.0, side_panels=False, accent="#ff2b2b", ideal_fov=62.0,
    ),
    "screenx": Room(
        slug="screenx",
        name="ScreenX 270°",
        tagline="Projeção que invade as duas paredes laterais",
        screen_width=18.0, screen_height=8.0,
        first_row_distance=8.0, row_depth=1.2, row_rise=0.38,
        rows=10, seats_per_row=14, seat_width=0.60,
        wrap_angle=130.0, side_panels=True, accent="#ff5252", ideal_fov=55.0,
    ),
    "standard": Room(
        slug="standard",
        name="Sala Standard 2D",
        tagline="Referência clássica, tela 14 m em 2.39:1",
        screen_width=14.0, screen_height=5.9,
        first_row_distance=7.5, row_depth=1.1, row_rise=0.30,
        rows=10, seats_per_row=14, seat_width=0.58,
        wrap_angle=0.0, side_panels=False, accent="#b31217", ideal_fov=42.0,
    ),
}


def room_payload(room: Room) -> Dict:
    """Sala + malha completa de assentos já analisados (usado pelo front-end)."""
    grid = [
        [room.analyze(r, s).to_dict() for s in range(room.seats_per_row)]
        for r in range(room.rows)
    ]
    return {"room": asdict(room), "grid": grid}