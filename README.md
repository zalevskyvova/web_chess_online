# ♟ Web Chess Online

Онлайн шахова гра з можливістю гри проти бота та мультиплеєра через кімнати.

## 📋 Опис

Web Chess Online — це веб-додаток для гри в шахи, побудований на **FastAPI**. Підтримує два режими гри:

- **Гра проти бота** — бот використовує [Lichess Cloud Eval API](https://lichess.org/api#tag/Analysis/operation/apiCloudEval) для розрахунку найкращого ходу з налаштовуваною складністю
- **Мультиплеєр** — гра з іншим гравцем через систему кімнат

### Ключові можливості

- ⏱ **Контроль часу** — 9 варіантів: `1+0`, `3+0`, `1+1`, `3+2`, `5+0`, `10+0`, `15+10`, `30+0`, та без обмежень
- 🤖 **Рівні складності бота** — `easy`, `medium`, `hard`, `unbeatable`
- 🏳 **Здача партії** та **пропозиція нічиєї**
- 📜 **Історія ходів** у SAN-нотації
- 🔄 **Автоматичне очищення** неактивних кімнат (після 5 хв без ходів)

## 🛠 Технології

| Компонент | Технологія |
|-----------|------------|
| Backend | [FastAPI](https://fastapi.tiangolo.com/) |
| Шахова логіка | [python-chess](https://python-chess.readthedocs.io/) |
| Аналіз ходів (бот) | [Lichess Cloud Eval API](https://lichess.org/api) |
| Фонові задачі | [fastapi-utils](https://github.com/dmontagu/fastapi-utils) |
| HTTP клієнт | [Requests](https://docs.python-requests.org/) |
| ASGI сервер | [Uvicorn](https://www.uvicorn.org/) |
| Frontend | HTML, CSS, JavaScript |

## 📁 Структура проєкту

```
chess_app/
├── main.py              # FastAPI додаток, ендпоінти API, таймери
├── chess_logic.py       # Шахова логіка (ходи, статус, бот)
├── requirements.txt     # Залежності Python
├── templates/
│   └── index.html       # HTML шаблон
├── static/
│   ├── css/
│   │   └── style.css    # Стилі
│   └── js/
│       └── game.js      # Клієнтська логіка гри
└── test_main.http       # HTTP тести для ендпоінтів
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

### `POST /create-room`

Створити нову ігрову кімнату.

**Тіло запиту:**
```json
{
  "time_control": "5+0",
  "difficulty": "medium",
  "against": "bot"
}
```

| Параметр | Тип | Опис |
|----------|-----|------|
| `time_control` | `string` | Контроль часу: `1+0`, `3+0`, `1+1`, `3+2`, `5+0`, `10+0`, `15+10`, `30+0`, `unlim` |
| `difficulty` | `string` | Складність бота: `easy`, `medium`, `hard`, `unbeatable` |
| `against` | `string` | Тип суперника: `bot` або `player` |

**Відповідь:** `"ABC123"` — ID кімнати (6 символів)

---

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

---

### `POST /move`

Зробити хід на дошці.

**Тіло запиту:**
```json
{
  "move": "e2e4",
  "color": true,
  "room_id": "ABC123"
}
```

**Відповідь:**
```json
{
  "success": "e7e5",
  "status": "playing",
  "turn": "White",
  "w_timer": 300,
  "b_timer": 300,
  "move_history": "1. e4 e5"
}
```

---

### `POST /board`

Отримати поточний стан дошки.

**Тіло запиту:**
```json
{
  "room_id": "ABC123"
}
```

**Відповідь:**
```json
{
  "current_FEN": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "w_timer": 300,
  "b_timer": 300,
  "status": "playing",
  "turn": "White",
  "move_history": ""
}
```

---

### `POST /resign`

Здатися у партії.

**Тіло запиту:**
```json
{
  "room_id": "ABC123",
  "turn": true
}
```

**Відповідь:**
```json
{
  "status": "resigned",
  "winner": false
}
```

---

### `POST /draw`

Запропонувати або прийняти/відхилити нічию.

**Тіло запиту:**
```json
{
  "room_id": "ABC123",
  "turn": true,
  "accept": true
}
```

**Відповіді:**
- `{"status": "draw_offered"}` — нічия запропонована
- `{"status": "draw"}` — нічия прийнята
- `{"status": "draw_declined"}` — нічия відхилена

## 📄 Ліцензія

MIT
