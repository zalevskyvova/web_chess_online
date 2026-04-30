import chess, time
from fastapi import FastAPI
from pydantic import BaseModel, field_validator, model_validator
import chess_logic
from chess_logic import make_move, which_side_move, game_status, get_bot_move, get_random_string, get_move_history
import random
import string
from fastapi_utils.tasks import repeat_every
import asyncio
from typing import Optional


app = FastAPI()
rooms_dict = {}

TIME_CONTROLS = {
    "1+0": (60, 0),
    "3+0": (180, 0),
    "1+1": (60, 1),
    "3+2": (180, 2),
    "5+0": (300, 0),
    "10+0": (600, 0),
    "15+10": (900, 0),
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
    color: str

    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        if v not in COLOR:
            raise ValueError('must contain valid color or random')
        return v

    @model_validator(mode='after')
    def check_agaist_who(self) -> 'CreateRoom':
        if self.against == 'bot' and self.difficulty is None:
            raise ValueError('Value error, must contain valid difficulty')
        return self

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
    def validate_difficulty(cls, v: str) -> str:
        if v is None:
            return v
        if v not in DIFFICULTY:
            raise ValueError('must contain valid difficulty')
        return v


@app.post("/move")
async def move(data: Chess):

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
        if turn == "White":

            rooms_dict[data.room_id]['b_timer'] += increment
        else:

            rooms_dict[data.room_id]['w_timer'] += increment


        if success and status == "playing":
            depth = DIFFICULTY[rooms_dict[data.room_id]['difficulty']]
            await asyncio.sleep(5)
            bot_move = get_bot_move(board, depth)
            make_move(board, bot_move)
            rooms_dict[data.room_id]['last_move_time'] = time.time()
            status = game_status(board)
            turn = which_side_move(board)
            move_history = get_move_history(board)
            return {'success': bot_move,
                'status': status,
                'turn': turn,
                'w_timer':rooms_dict[data.room_id]['w_timer'],
                'b_timer':rooms_dict[data.room_id]['b_timer'],
                'move_history': move_history}
        return {'success': success,
                'status': status,
                'turn': turn,
                'w_timer': rooms_dict[data.room_id]['w_timer'],
                'b_timer': rooms_dict[data.room_id]['b_timer'],
                'move_history': move_history}

    else:
        success = make_move(board, data.move)
        rooms_dict[data.room_id]['last_move_time'] = time.time()
        status = game_status(board)
        turn = which_side_move(board)
        move_history = get_move_history(board)
        increment = rooms_dict[data.room_id]['increment']
        if turn == "White":

            rooms_dict[data.room_id]['b_timer'] += increment
        else:

            rooms_dict[data.room_id]['w_timer'] += increment
        return {'success': success,
                'status': status,
                'turn' : turn,
                'w_timer':rooms_dict[data.room_id]['w_timer'],
                'b_timer':rooms_dict[data.room_id]['b_timer'],
                'move_history': move_history}


@app.post("/create-room")
async def create_room(data: CreateRoom):
    game_time, increment = TIME_CONTROLS[data.time_control]
    room_id = get_random_string(6)
    if data.color == "random":
        color = random.choice(["white", "black"])
    else:
        color = data.color
    rooms_dict[room_id] = {
        'board': chess.Board(),
        'timer': data.time_control,
        'w_timer': game_time,
        'b_timer': game_time,
        'increment': increment,
        'last_move_time': time.time(),
        'difficulty': data.difficulty,
        'draw_offer': None,
        'against': data.against,
        'color': color
    }
    return {'room_id': room_id, 'color': color}
@app.post("/join-room")
async def join_room(data: JoinRoom):
    if data.room_id in rooms_dict:
        return {'joined': True, 'room_id': data.room_id}
    else:
        return  {'joined': False}

@app.on_event('startup')
@repeat_every(seconds=1)
def timer_decreasing():
        to_delete = []
        for room_id in rooms_dict:
            board = rooms_dict[room_id]['board']
            if board.move_stack != []:
                turn = which_side_move(board)
                if game_status(board) == "playing":
                    if turn == "White":
                        rooms_dict[room_id]['w_timer'] -= 1

                    else:
                        rooms_dict[room_id]['b_timer'] -= 1
                if time.time() - rooms_dict[room_id]['last_move_time'] > 300:
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
    return {
        'current_FEN': board.fen(),
        'w_timer': w_time,
        'b_timer': b_time,
        'status': status,
        'turn': turn,
        'move_history': move_history
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