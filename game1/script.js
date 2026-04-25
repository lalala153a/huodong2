const DIRECTION_DEFS = [
  { id: "right", label: "向右", deltaRow: 0, deltaCol: 1, rotation: 0 },
  { id: "left", label: "向左", deltaRow: 0, deltaCol: -1, rotation: 180 },
  { id: "up", label: "向上", deltaRow: -1, deltaCol: 0, rotation: -90 },
  { id: "down", label: "向下", deltaRow: 1, deltaCol: 0, rotation: 90 },
  { id: "up-left", label: "左上", deltaRow: -1, deltaCol: -1, rotation: -135 },
  { id: "up-right", label: "右上", deltaRow: -1, deltaCol: 1, rotation: -45 },
  { id: "down-left", label: "左下", deltaRow: 1, deltaCol: -1, rotation: 135 },
  { id: "down-right", label: "右下", deltaRow: 1, deltaCol: 1, rotation: 45 },
];

const MAX_LOG_ITEMS = 5;
const START_BALL = { row: 3, col: 0 };
const GUIDE_PATH_CELLS = [
  { row: 3, col: 0 },
  { row: 3, col: 1 },
  { row: 2, col: 1 },
  { row: 2, col: 2 },
  { row: 1, col: 1 },
  { row: 0, col: 1 },
];

const state = {
  started: false,
  rows: 4,
  cols: 4,
  ball: { ...START_BALL },
  steps: 0,
  recentMoves: [],
};

const elements = {
  board: document.getElementById("board"),
  ball: document.getElementById("ball"),
  controlsGrid: document.getElementById("controlsGrid"),
  moveLog: document.getElementById("moveLog"),
  pathOverlay: document.getElementById("pathOverlay"),
  pathLineShadow: document.getElementById("pathLineShadow"),
  pathLine: document.getElementById("pathLine"),
  startButton: document.getElementById("startButton"),
  clearButton: document.getElementById("clearButton"),
  stepCount: document.getElementById("stepCount"),
  statusText: document.getElementById("statusText"),
};

function createArrowSvg(rotation) {
  return `
    <svg viewBox="0 0 40 40" class="arrow-icon" style="--rotation:${rotation}deg" aria-hidden="true" focusable="false">
      <path d="M4 13.5h18V6l13 10.5L22 27v-7.5H4z"></path>
    </svg>
  `;
}

function createBoardCells() {
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      fragment.appendChild(cell);
    }
  }

  elements.board.prepend(fragment);
}

function renderControls() {
  elements.controlsGrid.innerHTML = DIRECTION_DEFS.map((direction) => `
    <button
      class="direction-button"
      type="button"
      data-direction="${direction.id}"
      aria-label="${direction.label}"
      title="${direction.label}"
      disabled
    >
      ${createArrowSvg(direction.rotation)}
    </button>
  `).join("");
}

function renderMoveLog() {
  const fragment = document.createDocumentFragment();
  const visibleMoves = state.recentMoves.slice(-MAX_LOG_ITEMS);

  for (let index = 0; index < MAX_LOG_ITEMS; index += 1) {
    const slot = document.createElement("div");
    slot.className = "move-slot";

    if (visibleMoves[index]) {
      slot.innerHTML = createArrowSvg(visibleMoves[index].rotation);
      slot.setAttribute("aria-label", `第 ${index + 1} 步：${visibleMoves[index].label}`);
    } else {
      slot.innerHTML = '<span class="move-slot__placeholder" aria-hidden="true"></span>';
      slot.setAttribute("aria-label", `第 ${index + 1} 步：空`);
    }

    fragment.appendChild(slot);
  }

  elements.moveLog.replaceChildren(fragment);
}

function updateStepCount() {
  elements.stepCount.textContent = String(state.steps);
}

function setStatus(text) {
  if (elements.statusText) {
    elements.statusText.textContent = text;
  }
}

function syncControlState() {
  elements.controlsGrid.querySelectorAll(".direction-button").forEach((button) => {
    button.disabled = !state.started;
  });
}

function getCell(row, col) {
  return elements.board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function getCellCenter(row, col) {
  const cell = getCell(row, col);
  if (!cell) {
    return null;
  }

  return {
    x: cell.offsetLeft + cell.clientWidth / 2,
    y: cell.offsetTop + cell.clientHeight / 2,
  };
}

function renderPath() {
  if (!elements.pathOverlay || !elements.pathLineShadow || !elements.pathLine) {
    return;
  }

  const boardWidth = elements.board.clientWidth;
  const boardHeight = elements.board.clientHeight;
  elements.pathOverlay.setAttribute("viewBox", `0 0 ${boardWidth} ${boardHeight}`);

  const points = GUIDE_PATH_CELLS
    .map(({ row, col }) => getCellCenter(row, col))
    .filter(Boolean);

  if (points.length < 2) {
    elements.pathLineShadow.setAttribute("points", "");
    elements.pathLine.setAttribute("points", "");
    return;
  }

  const pointString = points.map(({ x, y }) => `${x},${y}`).join(" ");

  elements.pathLineShadow.setAttribute("points", pointString);
  elements.pathLine.setAttribute("points", pointString);
}

function placeBall(animate) {
  const targetCell = getCell(state.ball.row, state.ball.col);
  if (!targetCell) {
    return;
  }

  const cellWidth = targetCell.clientWidth;
  const cellHeight = targetCell.clientHeight;
  const ballSize = Math.min(cellWidth, cellHeight) * 0.68;
  const offsetX = targetCell.offsetLeft + (cellWidth - ballSize) / 2;
  const offsetY = targetCell.offsetTop + (cellHeight - ballSize) / 2 + 4;

  elements.ball.classList.toggle("ball--instant", !animate);
  elements.ball.style.width = `${ballSize}px`;
  elements.ball.style.height = `${ballSize}px`;
  elements.ball.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

  if (!animate) {
    requestAnimationFrame(() => {
      elements.ball.classList.remove("ball--instant");
    });
  }
}

function resetState(started, statusMessage) {
  state.started = started;
  state.ball = { ...START_BALL };
  state.steps = 0;
  state.recentMoves = [];

  updateStepCount();
  renderMoveLog();
  renderPath();
  syncControlState();
  setStatus(statusMessage);
  placeBall(false);
}

function isInsideBoard(row, col) {
  return row >= 0 && row < state.rows && col >= 0 && col < state.cols;
}

function handleMove(directionId, sourceButton) {
  if (!state.started) {
    setStatus("请先点击开始，再移动足球。");
    return;
  }

  const direction = DIRECTION_DEFS.find((item) => item.id === directionId);
  if (!direction) {
    return;
  }

  const nextRow = state.ball.row + direction.deltaRow;
  const nextCol = state.ball.col + direction.deltaCol;

  if (!isInsideBoard(nextRow, nextCol)) {
    setStatus(`${direction.label} 超出边界。`);

    if (sourceButton) {
      sourceButton.classList.remove("is-blocked");
      void sourceButton.offsetWidth;
      sourceButton.classList.add("is-blocked");
    }

    return;
  }

  state.ball = { row: nextRow, col: nextCol };
  state.steps += 1;
  state.recentMoves = [...state.recentMoves.slice(-(MAX_LOG_ITEMS - 1)), direction];

  updateStepCount();
  renderMoveLog();
  renderPath();
  placeBall(true);
  setStatus(`已执行${direction.label}，当前步数 ${state.steps}。`);
}

function bindEvents() {
  elements.startButton.addEventListener("click", () => {
    resetState(true, "训练已开始，使用方向按钮控制足球移动。");
  });

  elements.clearButton.addEventListener("click", () => {
    resetState(false, "已清除当前记录，点击开始可重新训练。");
  });

  elements.controlsGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".direction-button");
    if (!button) {
      return;
    }

    handleMove(button.dataset.direction, button);
  });

  window.addEventListener("resize", () => {
    placeBall(false);
    renderPath();
  });
}

function init() {
  createBoardCells();
  renderControls();
  renderMoveLog();
  updateStepCount();
  bindEvents();
  resetState(false, "点击开始后，在棋盘上记录五步路线。");
}

init();
