# ♟ Web Chess Online

Онлайн шахова гра з можливістю гри проти бота та мультиплеєра через кімнати.

## 📋 Опис

Web Chess Online — це веб-додаток для гри в шахи, побудований на **FastAPI**. Підтримує два режими гри:

- **Гра проти бота** — бот використовує [Lichess Cloud Eval API](https://lichess.org/api#tag/Analysis/operation/apiCloudEval) для розрахунку найкращого ходу
- **Мультиплеєр** — гра з іншим гравцем через систему кімнат

## 🛠 Технології

| Компонент | Технологія |
|-----------|------------|
| Backend | [FastAPI](https://fastapi.tiangolo.com/) |
| Шахова логіка | [python-chess](https://python-chess.readthedocs.io/) |
| Аналіз ходів (бот) | [Lichess Cloud Eval API](https://lichess.org/api) |
| HTTP клієнт | [Requests](https://docs.python-requests.org/) |
| ASGI сервер | [Uvicorn](https://www.uvicorn.org/) |
| Frontend | HTML, CSS, JavaScript |

## 📁 Структура проєкту

```
chess_app/
├── main.py              # FastAPI додаток, ендпоінти API
├── chess_logic.py        # Шахова логіка (ходи, статус, бот)
├── requirements.txt      # Залежності Python
├── templates/
│   └── index.html        # HTML шаблон
├── static/
│   ├── css/
│   │   └── style.css     # Стилі
│   └── js/
│       └── game.js       # Клієнтська логіка гри
└── test_main.http        # HTTP тести для ендпоінтів
```

## 🚀 Встановлення та запуск

### 1. Клонування репозиторію

```bash
git clone https://github.com/zalevskyvova/web_chess_online.git
cd web_chess_online
```

### 2. Створення віртуального середовища

```bash
python -m venv .venv
```

**Windows:**
```bash
.venv\Scripts\activate
```

**Linux / macOS:**
```bash
source .venv/bin/activate
```

### 3. Встановлення залежностей

```bash
pip install -r requirements.txt
```

### 4. Запуск сервера

```bash
uvicorn main:app --reload
```

Сервер буде доступний за адресою: [http://127.0.0.1:8000](http://127.0.0.1:8000)

## 📡 API Ендпоінти

### `POST /move`

Зробити хід на дошці.

**Тіло запиту:**
```json
{
  "move": "e2e4",
  "color": true,
  "agaist": "bot",
  "room_id": "ABC123"
}
```

**Відповідь:**
```json
{
  "success": "e7e5",
  "status": "playing",
  "turn": "White"
}
```

### `POST /create-room`

Створити нову ігрову кімнату.

**Відповідь:** `"ABC123"` — ID кімнати (6 символів)

### `POST /join-room`

Приєднатися до існуючої кімнати.

**Тіло запиту:**
```json
{
  "room_id": "ABC123"
}
```

**Відповідь:**
```json
{
  "joined": true,
  "room_id": "ABC123"
}
```

## 📄 Ліцензія

MIT
