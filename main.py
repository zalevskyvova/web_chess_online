import chess, time
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from pydantic import BaseModel, field_validator, model_validator, EmailStr
from typing import Optional
import random
import string
from fastapi_utils.tasks import repeat_every
import asyncio

import chess_logic
from chess_logic import make_move, which_side_move, game_status, get_bot_move, get_random_string, get_move_history
from database import create_tables, get_db, User
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_optional_user
)
from sqlalchemy.orm import Session

app = FastAPI(title="Chess Online")

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Create DB tables on startup
create_tables()
rooms_dict = {}

TIME_CONTROLS = {
    "1+0": (60, 0),
    "3+0": (180, 0),
    "1+1": (60, 1),
    "3+2": (180, 2),
    "5+0": (300, 0),
    "10+0": (600, 0),
    "15+10": (900, 10),
    "30+0": (1800, 0),
    "unlim": (999999, 0)
}
DIFFICULTY = {
    "easy": 3,
    "medium": 8,
    "hard": 12,
    "unbeatable": 20
}

AGAINST = {
    "bot": "bot",
    "player": "player"
}

COLOR = {
    "white": "white",
    "black": "black",
    "random": "random"
}


# ─────────────────────────────────────────────
#  Pydantic models — Chess game
# ─────────────────────────────────────────────
class Chess(BaseModel):
    move: str
    color: bool
    room_id: str
class JoinRoom(BaseModel):
    room_id: str


class Resign(BaseModel):
    room_id: str
    turn: bool


class Draw(BaseModel):
    room_id: str
    turn: bool
    accept: bool


class CreateRoom(BaseModel):
    time_control: str
    difficulty: Optional[str] = None
    against: str
    color: str = "white"

    @field_validator('against')
    @classmethod
    def validate_against_name(cls, v: str) -> str:
        if v not in AGAINST:
            raise ValueError('must contain valid against name')
        return v

    @field_validator('time_control')
    @classmethod
    def validate_time_control(cls, v: str) -> str:
        if v not in TIME_CONTROLS:
            raise ValueError('must contain valid time control')
        return v

    @field_validator('difficulty')
    @classmethod
    def validate_difficulty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in DIFFICULTY:
            raise ValueError('must contain valid difficulty')
        return v



# ─────────────────────────────────────────────
#  Pydantic models — Auth
# ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    password_confirm: str

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if len(v) > 30:
            raise ValueError('Username must be at most 30 characters')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

    @model_validator(mode='after')
    def passwords_match(self) -> 'RegisterRequest':
        if self.password != self.password_confirm:
            raise ValueError('Passwords do not match')
        return self


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  HTML page routes
# ─────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(request, "login.html")


@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    return templates.TemplateResponse(request, "register.html")


@app.get("/game", response_class=HTMLResponse)
async def game_page(request: Request):
    return templates.TemplateResponse(request, "game.html")


@app.get("/game-bot", response_class=HTMLResponse)
async def game_bot_page(request: Request):
    return templates.TemplateResponse(request, "gamewithBot.html")


@app.get("/rules", response_class=HTMLResponse)
async def rules_page(request: Request):
    return templates.TemplateResponse(request, "rulesofgame.html")


# ─────────────────────────────────────────────
#  Auth API routes
# ─────────────────────────────────────────────

@app.post("/auth/register")
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Check username uniqueness
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    # Check email uniqueness
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username, "email": user.email}
    }


@app.post("/auth/login")
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token = create_access_token({"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username, "email": user.email}
    }


@app.get("/auth/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }


@app.post("/auth/logout")
async def logout():
    # JWT is stateless — client simply discards the token
    return {"success": True, "message": "Logged out successfully"}


# ─────────────────────────────────────────────
#  Chess game API routes (protected)
# ─────────────────────────────────────────────

@app.post("/move")
async def move(data: Chess, current_user: User = Depends(get_current_user)):
    try:
        board = rooms_dict[data.room_id]['board']
    except KeyError:
        return {'success': False, 'status': 'room not found'}

    if rooms_dict[data.room_id]['against'] == 'bot':
        success = make_move(board, data.move)
        status = game_status(board)
        turn = which_side_move(board)
        move_history = get_move_history(board)
        increment = rooms_dict[data.room_id]['increment']
        # Add increment to the player who JUST moved (opposite of whose turn it is now)
        if turn == "White":
            rooms_dict[data.room_id]['b_timer'] += increment
        else:
            rooms_dict[data.room_id]['w_timer'] += increment

        if success and status in ("playing", "check"):
            diff = DIFFICULTY[rooms_dict[data.room_id]['difficulty']]
            await asyncio.sleep(0.5)
            bot_move = get_bot_move(board, diff['engine_prob'], diff['depth'])
            if bot_move is None:
                return {'success': False, 'status': 'bot_error'}
            make_move(board, bot_move)
            rooms_dict[data.room_id]['last_move_time'] = time.time()
            status = game_status(board)
            turn = which_side_move(board)
            move_history = get_move_history(board)
            return {
                'success': bot_move,
                'status': status,
                'turn': turn,
                'w_timer': rooms_dict[data.room_id]['w_timer'],
                'b_timer': rooms_dict[data.room_id]['b_timer'],
                'move_history': move_history
            }
        return {
            'success': success,
            'status': status,
            'turn': turn,
            'w_timer': rooms_dict[data.room_id]['w_timer'],
            'b_timer': rooms_dict[data.room_id]['b_timer'],
            'move_history': move_history
        }

    else:
        success = make_move(board, data.move)
        rooms_dict[data.room_id]['last_move_time'] = time.time()
        status = game_status(board)
        turn = which_side_move(board)
        move_history = get_move_history(board)
        increment = rooms_dict[data.room_id]['increment']
        # Add increment to the player who JUST moved (opposite of whose turn it is now)
        if turn == "White":
            rooms_dict[data.room_id]['b_timer'] += increment
        else:
            rooms_dict[data.room_id]['w_timer'] += increment
        return {
            'success': success,
            'status': status,
            'turn': turn,
            'w_timer': rooms_dict[data.room_id]['w_timer'],
            'b_timer': rooms_dict[data.room_id]['b_timer'],
            'move_history': move_history
        }


@app.post("/create-room")
async def create_room(data: CreateRoom, current_user: User = Depends(get_current_user)):
    game_time, increment = TIME_CONTROLS[data.time_control]
    room_id = get_random_string(6)
    
    # If playing against another player, difficulty isn't used. Default to easy if needed.
    diff = data.difficulty if data.difficulty else "easy"
    
    # Resolve random color
    final_color = data.color
    if final_color == "random":
        final_color = random.choice(["white", "black"])
    
    rooms_dict[room_id] = {
        'board': chess.Board(),
        'timer': data.time_control,
        'w_timer': game_time,
        'b_timer': game_time,
        'increment': increment,
        'last_move_time': time.time(),
        'difficulty': diff,
        'draw_offer': None,
        'against': data.against,
        'color': final_color,
        'owner': current_user.username
    }
    return {'room_id': room_id, 'color': final_color}
@app.post("/join-room")
async def join_room(data: JoinRoom):
    if data.room_id in rooms_dict:
        owner_color = rooms_dict[data.room_id]['color']  # color the room owner chose
        rooms_dict[data.room_id]['has_guest'] = True
        return {'joined': True, 'room_id': data.room_id, 'owner_color': owner_color}
    else:
        return {'joined': False}



@app.on_event('startup')
@repeat_every(seconds=1)
def timer_decreasing():
    to_delete = []
    for room_id in rooms_dict:
        board = rooms_dict[room_id]['board']
        status = game_status(board)
        if board.move_stack != []:
            turn = which_side_move(board)
            if status in ("playing", "check"):
                if turn == "White":
                    rooms_dict[room_id]['w_timer'] -= 1
                else:
                    rooms_dict[room_id]['b_timer'] -= 1
        game_over = status in ("checkmate", "stalemate", "game end")
        timed_out = time.time() - rooms_dict[room_id]['last_move_time'] > 300
        if game_over or timed_out:
            to_delete.append(room_id)
    for room_id in to_delete:
        del rooms_dict[room_id]
@app.post("/board")
async def board(data: JoinRoom):
    try:
        board = rooms_dict[data.room_id]['board']
    except KeyError:
        return {'success': False, 'status': 'room not found'}
    status = game_status(board)
    turn = which_side_move(board)
    move_history = get_move_history(board)
    w_time = rooms_dict[data.room_id]['w_timer']
    b_time = rooms_dict[data.room_id]['b_timer']
    has_guest = rooms_dict[data.room_id].get('has_guest', False)
    return {
        'current_FEN': board.fen(),
        'w_timer': w_time,
        'b_timer': b_time,
        'status': status,
        'turn': turn,
        'move_history': move_history,
        'has_guest': has_guest
    }


@app.post("/resign")
async def resign(data: Resign):
    if data.room_id not in rooms_dict:
        return {'success': False, 'status': 'room not found'}
    if data.turn == True:
        return {'status': 'resigned', 'winner': False}
    if data.turn == False:
        return {'status': 'resigned', 'winner': True}


@app.post("/draw")
async def draw(data: Draw):
    if data.room_id not in rooms_dict:
        return {'success': False, 'status': 'room not found'}
    if rooms_dict[data.room_id]['draw_offer'] is None:
        draw_offer = data.turn
        rooms_dict[data.room_id]['draw_offer'] = draw_offer
        return {'status': 'draw_offered'}
    else:
        if data.accept == True:
            return {'status': 'draw'}
        else:
            rooms_dict[data.room_id]['draw_offer'] = None
            return {'status': 'draw_declined'}


@app.post("/legal-moves")
async def legal_moves(data: JoinRoom):
    """Return all legal moves for the current board position grouped by source square."""
    try:
        board = rooms_dict[data.room_id]['board']
    except KeyError:
        return {'success': False, 'moves': {}}

    moves: dict[str, list[str]] = {}
    for move in board.legal_moves:
        src = chess.square_name(move.from_square)
        dst = chess.square_name(move.to_square)
        moves.setdefault(src, []).append(dst)

    return {'moves': moves}