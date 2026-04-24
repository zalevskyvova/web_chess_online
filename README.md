# ♟ Web Chess Online

Онлайн шахова гра з можливістю гри проти бота та мультиплеєра через кімнати.

## 📋 Опис

Web Chess Online — це веб-додаток для гри в шахи, побудований на **FastAPI**. Підтримує два режими гри:

- **Гра проти бота** — бот використовує [Lichess Cloud Eval API](https://lichess.org/api#tag/Analysis/operation/apiCloudEval) для розрахунку найкращого ходу з налаштовуваним рівнем складності
- **Мультиплеєр** — гра з іншим гравцем через систему кімнат

### ⏱ Контроль часу

Доступні наступні варіанти контролю часу:

| Формат | Час (сек.) | Інкремент (сек.) |
|--------|-----------|-----------------|
| 1+0    | 60        | 0               |
| 1+1    | 60        | 1               |
| 3+0    | 180       | 0               |
| 3+2    | 180       | 2               |
| 5+0    | 300       | 0               |
| 10+0   | 600       | 0               |
| 15+10  | 900       | 10              |
| 30+0   | 1800      | 0               |
| unlim  | ♾ без ліміту | 0            |

### 🤖 Рівні складності бота

| Рівень     | Глибина аналізу |
|------------|----------------|
| easy       | 3              |
| medium     | 8              |
| hard       | 12             |
| unbeatable | 20             |

## 🛠 Технології

| Компонент          | Технологія                                                  |
|--------------------|-------------------------------------------------------------|
| Backend            | [FastAPI](https://fastapi.tiangolo.com/)                    |
| Шахова логіка      | [python-chess](https://python-chess.readthedocs.io/)        |
| Аналіз ходів (бот) | [Lichess Cloud Eval API](https://lichess.org/api)           |
| HTTP клієнт        | [Requests](https://docs.python-requests.org/)               |
| ASGI сервер        | [Uvicorn](https://www.uvicorn.org/)                         |
| Таймери            | [fastapi-utils](https://fastapi-utils.davidmontague.xyz/)   |
| Валідація даних    | [Pydantic](https://docs.pydantic.dev/)                      |
| Шаблони            | [Jinja2](https://jinja.palletsprojects.com/)                |
| Frontend           | HTML, CSS, JavaScript                                        |

## 📁 Структура проєкту

```
chess_app/
├── main.py                # FastAPI додаток, ендпоінти API, таймери
├── chess_logic.py          # Шахова логіка (ходи, статус, бот)
├── requirements.txt        # Залежності Python
├── test.py                 # Тести
├── test_main.http          # HTTP тести для ендпоінтів
├── templates/
│   ├── index.html          # Головна сторінка (вибір режиму гри)
│   ├── game.html           # Сторінка мультиплеєр гри
│   ├── gamewithBot.html    # Сторінка гри проти бота
│   └── rulesofgame.html    # Правила гри
└── static/
    ├── css/
    │   └── style.css       # Стилі
    └── js/
        └── game.js         # Клієнтська логіка гри
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

- `time_control` — формат часу (`1+0`, `3+0`, `3+2`, `5+0`, `10+0`, `15+10`, `30+0`, `unlim`)
- `difficulty` — рівень бота (`easy`, `medium`, `hard`, `unbeatable`)
- `against` — тип суперника (`bot` або `player`)

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
  "move_history": ["e4", "e5"]
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
  "move_history": []
}
```

---

### `POST /resign`

Здатися.

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
  "accept": false
}
```

**Відповідь (пропозиція):**
```json
{
  "status": "draw_offered"
}
```

**Відповідь (прийнято):**
```json
{
  "status": "draw"
}
```

**Відповідь (відхилено):**
```json
{
  "status": "draw_declined"
}
```

## ⚙️ Особливості

- **Автоматичний таймер** — сервер щосекундно зменшує час гравця, чий хід
- **Інкремент часу** — після кожного ходу додається інкремент відповідно до обраного контролю часу
- **Автоочищення кімнат** — неактивні кімнати (без ходів понад 5 хвилин) видаляються автоматично
- **Історія ходів** — кожна відповідь містить повну історію ходів у SAN нотації
- **Валідація ходів** — всі ходи перевіряються через `python-chess` на легальність

## 📄 Ліцензія

MIT
