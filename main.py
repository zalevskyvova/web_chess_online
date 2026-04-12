import chess, time
from fastapi import FastAPI
from pydantic import BaseModel
import chess_logic
from chess_logic import make_move, which_side_move, game_status, get_bot_move, get_random_string, get_move_history
import random
import string
from fastapi_utils.tasks import repeat_every
import asyncio

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
    "unlim": (float('inf'), 0)
}
DIFFICULTY = {
    "easy": 3,
    "medium": 8,
    "hard": 12,
    "unbeatable": 20
}

class Chess(BaseModel):
    move: str
    color: bool
    against: str
    room_id: str

class Room(BaseModel):
    room_id: str
    time_control: str
    difficulty: str

@app.post("/move")
async def move(data: Chess):

    try:
        board = rooms_dict[data.room_id]['board']
    except KeyError:
        return {'success': False, 'status': 'room not found'}

    if data.against == 'bot':
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
async def create_room(data: Room):
    game_time, increment = TIME_CONTROLS[data.time_control]
    room_id = get_random_string(6)
    rooms_dict[room_id] = {
        'board': chess.Board(),
        'timer': data.time_control,
        'w_timer': game_time,
        'b_timer': game_time,
        'increment': increment,
        'last_move_time': time.time(),
        'difficulty': data.difficulty
    }
    return room_id
@app.post("/join-room")
async def join_room(data: Room):
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
