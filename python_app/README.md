# Simulador de Assento 3D — versão Python (Flask)

Preview sensorial da sala: mostra em 3D (CSS transforms) como a tela é vista
de cada fileira, com IMAX, ScreenX 270° e sala standard.

```bash
cd python_app
pip install -r requirements.txt
python app.py     # http://127.0.0.1:5000
```

## Estrutura
- `cinema.py` — modelo das salas e toda a matemática (FOV, ângulos, nota de imersão)
- `app.py` — rotas Flask + API JSON (`/api/sala/<slug>`, `/api/assento/<slug>?row=&seat=`)
- `templates/index.html` — marcação do palco 3D e do mapa de assentos
- `static/css/style.css` — estética vermelho/preto e a cena 3D
- `static/js/simulator.js` — traduz os números em variáveis CSS
- `static/img/` — imagens da sala geradas artificialmente

A mesma lógica está portada em `src/lib/cinema.ts` para a prévia React do site.