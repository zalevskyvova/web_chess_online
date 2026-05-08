
import random
import string
import chess
import requests

# engine_prob  - ймовірність що бот зробить хід через Stockfish (0.0 = завжди рандом)
# depth        - глибина пошуку Stockfish (використовується лише якщо engine_prob > 0)
DIFFICULTY = {
    "easy":       {"engine_prob": 0.0,  "depth": 1},
    "medium":     {"engine_prob": 0.4,  "depth": 5},
    "hard":       {"engine_prob": 0.85, "depth": 12},
    "unbeatable": {"engine_prob": 1.0,  "depth": 20},
}

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
    if board.is_check():
        return "check"
    return "playing"
def which_side_move(board):
    if board.turn:
        return "White"
    else:
        return "Black"
def get_bot_move(board, engine_prob: float, depth: int):
    legal = list(board.legal_moves)
    if not legal:
        return None

    # Якщо випав випадок не для движкуна — робимо випадковий хід
    if random.random() >= engine_prob:
        return random.choice(legal).uci()

    try:
        current_fen = board.fen()
        response = requests.get(
            f"https://lichess.org/api/cloud-eval?fen={current_fen}&depth={depth}",
            timeout=5
        )
        response.raise_for_status()
        moves = response.json()['pvs'][0]['moves']
        return moves.split()[0]
    except Exception:
        # Fallback: випадковий хід якщо API недоступний
        return random.choice(legal).uci()
def get_random_string(length):
        # Choose characters from: lowercase, uppercase, and digits
        characters = string.ascii_letters + string.digits
        # Select 'length' characters and join them into a string
        return ''.join(random.choices(characters, k=length)).upper()
def get_move_history(board):
    start = chess.Board()
    return start.variation_san(board.move_stack)