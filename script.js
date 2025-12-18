// patrón prototype comienza aqui
// patrón prototype comienza aqui
// patrón prototype comienza aqui
function Cell(isAlive) {
    this.isAlive = isAlive || false;
}

Cell.prototype.clone = function() {
    return new Cell(this.isAlive);
};

Cell.prototype.toggle = function() {
    this.isAlive = !this.isAlive;
};
// patrón prototype termina aqui
// patrón prototype termina aqui
// patrón prototype termina aqui

// --- CONFIGURACIÓN DEL SISTEMA ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const cellSize = 20;
let rows, cols;
let grid = [];
let isRunning = false;
let simInterval = null;
let speed = 100;

// Variables de Selección
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };
let capturedPattern = null;

function init() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    cols = Math.floor(canvas.width / cellSize);
    rows = Math.floor(canvas.height / cellSize);
    
    // Inicializar rejilla con el prototipo
    const protoCell = new Cell(false);
    grid = Array.from({ length: rows }, () => 
        Array.from({ length: cols }, () => protoCell.clone())
    );
    draw();
}

// --- DIBUJO ---
function draw() {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c].isAlive) {
                ctx.fillStyle = "#00ffff"; // Cyan TNO
                ctx.fillRect(c * cellSize, r * cellSize, cellSize - 1, cellSize - 1);
            } else {
                ctx.strokeStyle = "#001525";
                ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
            }
        }
    }

    if (isSelecting) {
        ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            selectionStart.x * cellSize, 
            selectionStart.y * cellSize, 
            (selectionEnd.x - selectionStart.x) * cellSize, 
            (selectionEnd.y - selectionStart.y) * cellSize
        );
        ctx.setLineDash([]);
    }
    updateStatus();
}

// --- INTERACCIÓN ---
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (e.shiftKey) {
        isSelecting = true;
        selectionStart = { x, y };
        selectionEnd = { x, y };
    } else {
        grid[y][x].toggle();
        draw();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isSelecting) {
        const rect = canvas.getBoundingClientRect();
        selectionEnd = { 
            x: Math.floor((e.clientX - rect.left) / cellSize), 
            y: Math.floor((e.clientY - rect.top) / cellSize) 
        };
        draw();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isSelecting) {
        captureArea();
        isSelecting = false;
        draw();
    }
});

// --- CAPTURA Y PATRONES (HISTORIA 4) ---
function captureArea() {
    const xStart = Math.min(selectionStart.x, selectionEnd.x);
    const xEnd = Math.max(selectionStart.x, selectionEnd.x);
    const yStart = Math.min(selectionStart.y, selectionEnd.y);
    const yEnd = Math.max(selectionStart.y, selectionEnd.y);

    capturedPattern = [];
    for (let r = yStart; r <= yEnd; r++) {
        let rowData = [];
        for (let c = xStart; c <= xEnd; c++) {
            rowData.push(grid[r][c].isAlive);
        }
        capturedPattern.push(rowData);
    }
    console.log("Sector captured and stored in memory.");
}

function pastePattern() {
    if (!capturedPattern) return alert("NO HAY PATRÓN ALMACENADO");
    // Pega en el centro por defecto
    for (let r = 0; r < capturedPattern.length; r++) {
        for (let c = 0; c < capturedPattern[r].length; c++) {
            if (grid[r] && grid[r][c]) {
                grid[r][c].isAlive = capturedPattern[r][c];
            }
        }
    }
    draw();
}

// --- LÓGICA DE SIMULACIÓN (CONWAY) ---
function computeNextGen() {
    const nextGrid = grid.map(row => row.map(cell => cell.clone()));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let neighbors = countNeighbors(r, c);
            if (grid[r][c].isAlive) {
                if (neighbors < 2 || neighbors > 3) nextGrid[r][c].isAlive = false;
            } else {
                if (neighbors === 3) nextGrid[r][c].isAlive = true;
            }
        }
    }
    grid = nextGrid;
    draw();
}

function countNeighbors(r, c) {
    let sum = 0;
    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            if (i === 0 && j === 0) continue;
            let row = (r + i + rows) % rows;
            let col = (c + j + cols) % cols;
            if (grid[row][col].isAlive) sum++;
        }
    }
    return sum;
}

// --- CONTROLES DE UI ---
function toggleSim() {
    isRunning = !isRunning;
    const btn = document.getElementById('btn-play');
    const status = document.getElementById('sim-status');
    
    if (isRunning) {
        btn.innerText = "PARAR SIMULACIÓN";
        status.innerText = "ACTIVO";
        simInterval = setInterval(computeNextGen, speed);
    } else {
        btn.innerText = "INICIAR SIMULACIÓN";
        status.innerText = "PAUSADO";
        clearInterval(simInterval);
    }
}

function updateSpeed() {
    speed = document.getElementById('speed-control').value;
    if (isRunning) {
        clearInterval(simInterval);
        simInterval = setInterval(computeNextGen, speed);
    }
}

function saveToLocal() {
    const data = grid.map(row => row.map(cell => cell.isAlive));
    localStorage.setItem('tno_cell_save', JSON.stringify(data));
    alert("ESTADO GUARDADO");
}

function loadFromLocal() {
    const saved = localStorage.getItem('tno_cell_save');
    if (saved) {
        const data = JSON.parse(saved);
        grid = data.map(row => row.map(alive => new Cell(alive)));
        draw();
    }
}

function updateStatus() {
    const count = grid.flat().filter(c => c.isAlive).length;
    document.getElementById('cell-count').innerText = count;
}

function resetGrid() {
    grid.forEach(row => row.forEach(cell => cell.isAlive = false));
    draw();
}

window.onload = init;