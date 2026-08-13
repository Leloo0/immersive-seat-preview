"""
app.py
------
Servidor Flask do Simulador de Assento 3D / Preview Sensorial da Sala.

Rotas
  GET  /                      -> página do simulador (sala padrão: IMAX)
  GET  /sala/<slug>           -> página do simulador para uma sala específica
  GET  /api/sala/<slug>       -> JSON com a malha de assentos já analisada
  GET  /api/assento/<slug>    -> JSON de um único assento (?row=0&seat=6)

Rodar:
    pip install -r requirements.txt
    python app.py      # http://127.0.0.1:5000
"""

from __future__ import annotations

from dataclasses import asdict

from flask import Flask, abort, jsonify, render_template, request

from cinema import ROOMS, room_payload

app = Flask(__name__)


@app.route("/")
@app.route("/sala/<slug>")
def index(slug: str = "imax"):
    """Renderiza o simulador. Todo o estado inicial já vai embutido no HTML,
    então a primeira pintura não depende de nenhuma chamada AJAX."""
    room = ROOMS.get(slug)
    if room is None:
        abort(404)

    payload = room_payload(room)
    # Assento sugerido: o de maior nota de imersão da sala.
    best = max((s for row in payload["grid"] for s in row), key=lambda s: s["score"])

    return render_template(
        "index.html",
        rooms=[asdict(r) for r in ROOMS.values()],
        room=payload["room"],
        grid=payload["grid"],
        best=best,
    )


@app.get("/api/sala/<slug>")
def api_room(slug: str):
    """Malha completa de assentos analisados — consumida ao trocar de sala."""
    room = ROOMS.get(slug)
    if room is None:
        return jsonify(error="sala inexistente"), 404
    return jsonify(room_payload(room))


@app.get("/api/assento/<slug>")
def api_seat(slug: str):
    """Análise pontual de um assento (?row=&seat=), útil para integrações."""
    room = ROOMS.get(slug)
    if room is None:
        return jsonify(error="sala inexistente"), 404
    try:
        row = int(request.args.get("row", 0))
        seat = int(request.args.get("seat", 0))
    except ValueError:
        return jsonify(error="parâmetros inválidos"), 400
    if not (0 <= row < room.rows and 0 <= seat < room.seats_per_row):
        return jsonify(error="assento fora da sala"), 400
    return jsonify(room.analyze(row, seat).to_dict())


if __name__ == "__main__":
    app.run(debug=True)