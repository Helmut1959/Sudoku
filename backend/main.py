from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import uuid

app = FastAPI(title="Sudoku API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your GitHub Pages URL for production.
    allow_methods=["*"],
    allow_headers=["*"],
)

games = {}
DIFFICULTY_CLUES = {"leicht": 40, "mittel": 32, "schwer": 27}


def candidates(board, r, c):
    used = set(board[r])
    used |= {board[i][c] for i in range(9)}
    br, bc = (r // 3) * 3, (c // 3) * 3
    used |= {board[i][j] for i in range(br, br + 3) for j in range(bc, bc + 3)}
    return [n for n in range(1, 10) if n not in used]


def solve(board):
    best = None
    best_options = None
    for r in range(9):
        for c in range(9):
            if board[r][c] == 0:
                opts = candidates(board, r, c)
                if not opts:
                    return False
                if best is None or len(opts) < len(best_options):
                    best, best_options = (r, c), opts
                    if len(opts) == 1:
                        break
        if best_options is not None and len(best_options) == 1:
            break
    if best is None:
        return True
    r, c = best
    random.shuffle(best_options)
    for n in best_options:
        board[r][c] = n
        if solve(board):
            return True
    board[r][c] = 0
    return False


def make_solution():
    board = [[0] * 9 for _ in range(9)]
    solve(board)
    return board


def count_solutions(board, limit=2):
    # Count up to `limit`; used to keep generated puzzles uniquely solvable.
    best, options = None, None
    for r in range(9):
        for c in range(9):
            if board[r][c] == 0:
                opts = candidates(board, r, c)
                if not opts:
                    return 0
                if options is None or len(opts) < len(options):
                    best, options = (r, c), opts
    if best is None:
        return 1
    total = 0
    r, c = best
    for n in options:
        board[r][c] = n
        total += count_solutions(board, limit - total)
        board[r][c] = 0
        if total >= limit:
            return total
    return total


def make_puzzle(difficulty):
    solution = make_solution()
    puzzle = [row[:] for row in solution]
    target = DIFFICULTY_CLUES[difficulty]
    cells = list(range(81))
    random.shuffle(cells)
    removed = 0
    for cell in cells:
        if removed >= 81 - target:
            break
        r, c = divmod(cell, 9)
        old = puzzle[r][c]
        puzzle[r][c] = 0
        copy = [row[:] for row in puzzle]
        if count_solutions(copy) == 1:
            removed += 1
        else:
            puzzle[r][c] = old
    return puzzle, solution


class CheckRequest(BaseModel):
    game_id: str
    board: list[list[int]]


@app.get("/")
def root():
    return {"status": "ok", "service": "Sudoku API"}


@app.post("/api/new")
def new_game(difficulty: str = "leicht"):
    difficulty = difficulty.lower()
    if difficulty not in DIFFICULTY_CLUES:
        raise HTTPException(status_code=400, detail="Unbekannter Schwierigkeitsgrad")
    puzzle, solution = make_puzzle(difficulty)
    game_id = str(uuid.uuid4())
    games[game_id] = {"puzzle": puzzle, "solution": solution}
    return {"game_id": game_id, "difficulty": difficulty, "board": puzzle}


@app.post("/api/check")
def check_game(request: CheckRequest):
    game = games.get(request.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Spiel nicht gefunden. Bitte starte ein neues Spiel.")
    board = request.board
    if len(board) != 9 or any(len(row) != 9 for row in board):
        raise HTTPException(status_code=400, detail="Das Spielfeld muss 9×9 sein.")
    solution = game["solution"]
    wrong, empty, correct = [], 0, 0
    for r in range(9):
        for c in range(9):
            value = board[r][c]
            if value == 0:
                empty += 1
            elif value == solution[r][c]:
                correct += 1
            else:
                wrong.append([r, c])
    return {"wrong_cells": wrong, "empty_cells": empty, "correct_cells": correct,
            "solved": empty == 0 and not wrong}
