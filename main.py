import chess
from fastapi import FastAPI
from pydantic import BaseModel
import chess_logic
from chess_logic import make_move, which_side_move, game_status

app = FastAPI()



class Chess(BaseModel):
    move: str
    color: bool
board = chess.Board()
@app.post("/move")
async def move(data: Chess):
    success = make_move(board, data.move)
    status = game_status(board)
    turn = which_side_move(board)
    return {'success': success,
            'status': status,
            'turn' : turn}

