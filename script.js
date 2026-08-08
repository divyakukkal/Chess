// Uses the chess.js library (loaded in index.html) to handle all chess rules:
// legal moves, check, checkmate, castling, en passant, promotion, etc.
const game = new Chess();

const boardEl = document.getElementById("board");
const statusText = document.getElementById("statusText");
const restartBtn = document.getElementById("restartBtn");
const undoBtn = document.getElementById("undoBtn");
const difficultySelect = document.getElementById("difficultySelect");
const gameOverMessage = document.getElementById("gameOverMessage");
const gameOverText = document.getElementById("gameOverText");
const playAgainBtn = document.getElementById("playAgainBtn");

let selectedSquare = null;
let legalMovesFromSelected = [];
let lastMove = null;
let computerThinking = false;

const pieceSymbols = {
  p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
  P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔"
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

function renderBoard() {
  boardEl.innerHTML = "";
  const boardState = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      const file = files[col];
      const rank = 8 - row;
      const squareName = file + rank;

      const isLight = (row + col) % 2 === 0;
      square.classList.add("square", isLight ? "light" : "dark");
      square.dataset.square = squareName;

      const piece = boardState[row][col];
      if (piece) {
        const symbol = piece.color === "w"
          ? pieceSymbols[piece.type.toUpperCase()]
          : pieceSymbols[piece.type];
        square.textContent = symbol;
      }

      if (selectedSquare === squareName) {
        square.classList.add("selected");
      }
      if (lastMove && (lastMove.from === squareName || lastMove.to === squareName)) {
        square.classList.add("last-move");
      }
      if (legalMovesFromSelected.some(m => m.to === squareName)) {
        square.classList.add(
          legalMovesFromSelected.find(m => m.to === squareName).captured
            ? "legal-capture"
            : "legal-move"
        );
      }

      square.addEventListener("click", () => handleSquareClick(squareName));
      boardEl.appendChild(square);
    }
  }
}

function handleSquareClick(squareName) {
  if (computerThinking) return;
  if (game.game_over()) return;
  if (game.turn() !== "w") return;

  const pieceOnSquare = game.get(squareName);

  if (selectedSquare) {
    const move = legalMovesFromSelected.find(m => m.to === squareName);
    if (move) {
      makeMove(selectedSquare, squareName);
      selectedSquare = null;
      legalMovesFromSelected = [];
      renderBoard();
      updateStatus();

      if (!game.game_over()) {
        computerThinking = true;
        statusText.textContent = "Computer is thinking...";
        setTimeout(makeComputerMove, 400);
      } else {
        showGameOverIfNeeded();
      }
      return;
    }

    if (pieceOnSquare && pieceOnSquare.color === "w") {
      selectedSquare = squareName;
      legalMovesFromSelected = game.moves({ square: squareName, verbose: true });
      renderBoard();
      return;
    }

    selectedSquare = null;
    legalMovesFromSelected = [];
    renderBoard();
    return;
  }

  if (pieceOnSquare && pieceOnSquare.color === "w") {
    selectedSquare = squareName;
    legalMovesFromSelected = game.moves({ square: squareName, verbose: true });
    renderBoard();
  }
}

function makeMove(from, to) {
  const move = game.move({ from, to, promotion: "q" });
  if (move) {
    lastMove = { from, to };
  }
}

const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function evaluateBoard() {
  const boardState = game.board();
  let score = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = boardState[row][col];
      if (!piece) continue;
      const value = pieceValues[piece.type];
      score += piece.color === "w" ? value : -value;
    }
  }
  return score;
}

function minimax(depth, alpha, beta, isMaximizing) {
  if (depth === 0 || game.game_over()) {
    return evaluateBoard();
  }

  const moves = game.moves();

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function makeComputerMove() {
  const difficulty = parseInt(difficultySelect.value, 10);
  const depth = difficulty;

  const moves = game.moves({ verbose: true });
  let bestMove = null;
  let bestScore = Infinity;

  for (const move of moves) {
    game.move(move);
    const score = minimax(depth - 1, -Infinity, Infinity, true);
    game.undo();
    if (score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  if (bestMove) {
    game.move({ from: bestMove.from, to: bestMove.to, promotion: "q" });
    lastMove = { from: bestMove.from, to: bestMove.to };
  }

  computerThinking = false;
  renderBoard();
  updateStatus();
  showGameOverIfNeeded();
}

function updateStatus() {
  if (game.game_over()) return;

  if (game.in_check()) {
    statusText.textContent = game.turn() === "w" ? "You're in check!" : "Computer is in check!";
  } else {
    statusText.textContent = game.turn() === "w" ? "Your move" : "Computer is thinking...";
  }
}

function showGameOverIfNeeded() {
  if (!game.game_over()) return;

  let message = "Game over";
  if (game.in_checkmate()) {
    message = game.turn() === "w" ? "Checkmate — computer wins!" : "Checkmate — you win! 🎉";
  } else if (game.in_draw()) {
    message = "It's a draw";
  } else if (game.in_stalemate()) {
    message = "Stalemate — it's a draw";
  }

  gameOverText.textContent = message;
  gameOverMessage.classList.remove("hidden");
}

function startGame() {
  game.reset();
  selectedSquare = null;
  legalMovesFromSelected = [];
  lastMove = null;
  computerThinking = false;
  gameOverMessage.classList.add("hidden");
  statusText.textContent = "Your move";
  renderBoard();
}

undoBtn.addEventListener("click", () => {
  if (computerThinking) return;
  game.undo();
  game.undo();
  selectedSquare = null;
  legalMovesFromSelected = [];
  lastMove = null;
  gameOverMessage.classList.add("hidden");
  renderBoard();
  updateStatus();
});

restartBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", startGame);

startGame();
