const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];
const CODE_LENGTH = 4;
const DIFFICULTIES = {
  easy: { label: "Easy", attempts: 10 },
  medium: { label: "Medium", attempts: 7 },
  hard: { label: "Hard", attempts: 5 }
};
const BEST_SCORE_KEY = "bullseye-best-score";

const slotElements = document.querySelectorAll(".slot");
const paletteElement = document.getElementById("palette");
const boardElement = document.getElementById("board");
const submitButton = document.getElementById("submit-button");
const newGameButton = document.getElementById("new-game-button");
const messageElement = document.getElementById("message");
const attemptsElement = document.getElementById("attempts-left");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const difficultyOptionsElement = document.getElementById("difficulty-options");
const difficultyValueElement = document.getElementById("difficulty-value");
const secretAreaElement = document.getElementById("secret-area");
const secretPegsElement = document.getElementById("secret-pegs");

let currentDifficulty = "easy";
let attemptsLimit = DIFFICULTIES.easy.attempts;
let secretCode = [];
let currentGuess = [];
let attemptsUsed = 0;
let gameOver = false;
let bestScore = 0;
let boardRows = [];

function startNewGame() {
  attemptsLimit = DIFFICULTIES[currentDifficulty].attempts;
  secretCode = generateSecretCode();
  currentGuess = [];
  attemptsUsed = 0;
  gameOver = false;

  createBoard();
  renderSlots();
  renderAttempts();
  renderDifficulty();
  updateControls();

  scoreElement.textContent = "0";
  bestScoreElement.textContent = bestScore;
  messageElement.textContent = "";
  messageElement.className = "message";
  secretPegsElement.innerHTML = "";
  secretAreaElement.classList.add("hidden");

  paletteElement.querySelectorAll(".color-button").forEach((button) => {
    button.disabled = false;
  });
}

function generateSecretCode() {
  const code = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * COLORS.length);
    code.push(COLORS[randomIndex]);
  }
  return code;
}

function createBoard() {
  boardElement.innerHTML = "";
  boardRows = [];

  for (let rowIndex = 0; rowIndex < attemptsLimit; rowIndex++) {
    const row = document.createElement("div");
    row.className = "board-row";

    const number = document.createElement("span");
    number.className = "row-number";
    number.textContent = rowIndex + 1;

    const pegs = document.createElement("div");
    pegs.className = "pegs";
    for (let i = 0; i < CODE_LENGTH; i++) {
      const peg = document.createElement("span");
      peg.className = "peg";
      pegs.appendChild(peg);
    }

    const feedback = document.createElement("div");
    feedback.className = "feedback-pegs";
    for (let i = 0; i < CODE_LENGTH; i++) {
      const feedbackPeg = document.createElement("span");
      feedbackPeg.className = "feedback-peg";
      feedback.appendChild(feedbackPeg);
    }

    row.appendChild(number);
    row.appendChild(pegs);
    row.appendChild(feedback);
    boardElement.appendChild(row);

    boardRows.push({
      row: row,
      pegs: Array.from(pegs.children),
      feedback: Array.from(feedback.children)
    });
  }

  if (!gameOver) {
    boardRows[0].row.classList.add("active");
  }
}

function addColorToGuess(color) {
  if (gameOver || currentGuess.length >= CODE_LENGTH) {
    return;
  }
  currentGuess.push(color);
  renderSlots();
  updateControls();
}

function removeColorFromSlot(index) {
  if (gameOver || index >= currentGuess.length) {
    return;
  }
  currentGuess.splice(index, 1);
  renderSlots();
  updateControls();
}

function renderSlots() {
  slotElements.forEach((slot, index) => {
    const color = currentGuess[index];
    slot.className = "slot" + (color ? " color-" + color : "");
    slot.setAttribute(
      "aria-label",
      color
        ? "Slot " + (index + 1) + ": " + color + " (click to remove)"
        : "Slot " + (index + 1) + ": empty"
    );
  });
}

function renderAttempts() {
  attemptsElement.textContent = attemptsLimit - attemptsUsed;
}

function renderDifficulty() {
  difficultyValueElement.textContent = DIFFICULTIES[currentDifficulty].label;
  difficultyOptionsElement.querySelectorAll(".difficulty-button").forEach((button) => {
    const isActive = button.dataset.difficulty === currentDifficulty;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function setDifficulty(difficulty) {
  if (!DIFFICULTIES[difficulty] || difficulty === currentDifficulty) {
    return;
  }
  currentDifficulty = difficulty;
  startNewGame();
}

function loadBestScore() {
  try {
    const saved = Number(localStorage.getItem(BEST_SCORE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  } catch (error) {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch (error) {
    // Storage may be unavailable; the game still works without persistence.
  }
}

function updateControls() {
  submitButton.disabled = gameOver || currentGuess.length !== CODE_LENGTH;
}

function evaluateGuess(guess, secret) {
  let bulls = 0;
  const secretCounts = {};
  const guessCounts = {};

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i] === secret[i]) {
      bulls++;
    } else {
      secretCounts[secret[i]] = (secretCounts[secret[i]] || 0) + 1;
      guessCounts[guess[i]] = (guessCounts[guess[i]] || 0) + 1;
    }
  }

  let hits = 0;
  for (const color in guessCounts) {
    if (secretCounts[color]) {
      hits += Math.min(guessCounts[color], secretCounts[color]);
    }
  }

  return { bulls: bulls, hits: hits };
}

function submitGuess() {
  if (gameOver || currentGuess.length !== CODE_LENGTH) {
    return;
  }

  const guess = currentGuess.slice();
  const result = evaluateGuess(guess, secretCode);

  renderGuessRow(attemptsUsed, guess, result);
  attemptsUsed++;
  renderAttempts();

  currentGuess = [];
  renderSlots();

  if (result.bulls === CODE_LENGTH) {
    endGame(true);
  } else if (attemptsUsed >= attemptsLimit) {
    endGame(false);
  } else {
    updateActiveRow();
  }

  updateControls();
}

function renderGuessRow(rowIndex, guess, result) {
  const boardRow = boardRows[rowIndex];

  boardRow.pegs.forEach((peg, index) => {
    peg.className = "peg color-" + guess[index];
  });

  boardRow.feedback.forEach((feedbackPeg, index) => {
    feedbackPeg.className = "feedback-peg";
    if (index < result.bulls) {
      feedbackPeg.classList.add("bull");
    } else if (index < result.bulls + result.hits) {
      feedbackPeg.classList.add("hit");
    }
  });

  boardRow.row.setAttribute(
    "aria-label",
    "Attempt " + (rowIndex + 1) + ": " + guess.join(", ") + ". " +
      result.bulls + " bulls, " + result.hits + " hits."
  );
}

function updateActiveRow() {
  boardRows.forEach((boardRow) => {
    boardRow.row.classList.remove("active");
  });

  if (!gameOver && attemptsUsed < attemptsLimit) {
    boardRows[attemptsUsed].row.classList.add("active");
  }
}

function endGame(won) {
  gameOver = true;

  const unusedAttempts = attemptsLimit - attemptsUsed;
  const score = won ? 100 + unusedAttempts * 20 : 0;
  const isNewBest = won && score > bestScore;

  scoreElement.textContent = score;

  if (isNewBest) {
    bestScore = score;
    bestScoreElement.textContent = bestScore;
    saveBestScore(bestScore);
  }

  paletteElement.querySelectorAll(".color-button").forEach((button) => {
    button.disabled = true;
  });

  if (won) {
    boardRows[attemptsUsed - 1].row.classList.add("win");
    let winMessage =
      "You cracked the code in " + attemptsUsed +
      (attemptsUsed === 1 ? " attempt!" : " attempts!") +
      " Final score: " + score + " points.";
    if (isNewBest) {
      winMessage += " New personal best!";
    }
    messageElement.textContent = winMessage;
    messageElement.className = "message win";
  } else {
    messageElement.textContent =
      "Game over! You ran out of attempts. Final score: 0 points.";
    messageElement.className = "message lose";
  }

  showSecret();
  updateControls();
}

function showSecret() {
  secretPegsElement.innerHTML = "";
  secretCode.forEach((color) => {
    const peg = document.createElement("span");
    peg.className = "peg color-" + color;
    secretPegsElement.appendChild(peg);
  });
  secretAreaElement.classList.remove("hidden");
}

difficultyOptionsElement.addEventListener("click", (event) => {
  const button = event.target.closest(".difficulty-button");
  if (!button) {
    return;
  }
  setDifficulty(button.dataset.difficulty);
});

paletteElement.addEventListener("click", (event) => {
  const button = event.target.closest(".color-button");
  if (!button || button.disabled) {
    return;
  }
  addColorToGuess(button.dataset.color);
});

document.getElementById("slots").addEventListener("click", (event) => {
  const slot = event.target.closest(".slot");
  if (!slot) {
    return;
  }
  removeColorFromSlot(Number(slot.dataset.index));
});

submitButton.addEventListener("click", submitGuess);
newGameButton.addEventListener("click", startNewGame);

bestScore = loadBestScore();
startNewGame();
