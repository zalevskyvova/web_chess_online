
import random
import string
import chess
import requests

board = chess.Board()

def make_move(board, move_uci):
    move = chess.Move.from_uci(move_uci)
    if move in board.legal_moves:
        board.push(move)
        return True
    else:
        return False

def game_status(board):
    if board.is_checkmate():
        return "checkmate"
    if board.is_stalemate():
        return "stalemate"
    if board.is_game_over():
        return "game end"
    else:
        return "playing"
def which_side_move(board):
    if board.turn:
        return "White"
    else:
        return "Black"
def get_best_move(board):
    try:
        current_fen = board.fen()
        response = requests.get(f"https://lichess.org/api/cloud-eval?fen={current_fen}")
        moves = response.json()['pvs'][0]['moves']
        return moves.split()[0]
    except requests.exceptions.RequestException:
        return None
def get_random_string(length):
        # Choose characters from: lowercase, uppercase, and digits
        characters = string.ascii_letters + string.digits
        # Select 'length' characters and join them into a string
        return ''.join(random.choices(characters, k=length)).upper()
