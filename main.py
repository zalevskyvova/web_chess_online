import chess
from fastapi import FastAPI
from pydantic import BaseModel
import chess_logic
from chess_logic import make_move, which_side_move, game_status, get_best_move, get_random_string
import random
import string

app = FastAPI()




class Chess(BaseModel):
    move: str
    color: bool
    agaist: str
    room_id: str

class Room(BaseModel):
    room_id: str
board = chess.Board()
@app.post("/move")
async def move(data: Chess):
    try:
        board = rooms_dict[data.room_id]
    except KeyError:
        return {'success': False, 'status': 'room not found'}

    if data.against == 'bot':
        success = make_move(board, data.move)
        status = game_status(board)
        turn = which_side_move(board)

        if success and status == "playing":
            bot_move = get_best_move(board)
            make_move(board, bot_move)
            status = game_status(board)
            turn = which_side_move(board)
            return {'success': bot_move,
                'status': status,
                'turn': turn}
        return {'success': success,
                'status': status,
                'turn': turn}
    else:
        success = make_move(board, data.move)
        status = game_status(board)
        turn = which_side_move(board)
        return {'success': success,
                'status': status,
                'turn' : turn}

rooms_dict = {}
@app.post("/create-room")
async def create_room():
    room_id = get_random_string(6)
    rooms_dict[room_id] = chess.Board()
    return room_id
@app.post("/join-room")
async def join_room(data: Room):
    if data.room_id in rooms_dict:
        return {'joined': True, 'room_id': data.room_id}
    else:
        return  {'joined': False}