/**
 * PATRÓN PROTOTYPE
 */
function Celda(estaViva) {
    this.estaViva = estaViva || false;
}

Celda.prototype.clonar = function() {
    return new Celda(this.estaViva);
};

Celda.prototype.alternar = function() {
    this.estaViva = !this.estaViva;
};

// --- VARIABLES GLOBALES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tamanoCelda = 20;
let filas, columnas;
let rejilla = [];
let enEjecucion = false;
let intervaloSim = null;
let velocidad = 100;

// Gestión de Selección y Pegado
let seleccionando = false;
let inicioSeleccion = { x: 0, y: 0 };
let finSeleccion = { x: 0, y: 0 };
let patronCapturado = null;
let esperandoPegado = false;

function inicializar() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    columnas = Math.floor(canvas.width / tamanoCelda);
    filas = Math.floor(canvas.height / tamanoCelda);
    
    const celdaProto = new Celda(false);
    rejilla = Array.from({ length: filas }, () => 
        Array.from({ length: columnas }, () => celdaProto.clonar())
    );
    
    actualizarListaPartidas();
    dibujar();
}

// --- RENDERIZADO ---
function dibujar() {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let f = 0; f < filas; f++) {
        for (let c = 0; c < columnas; c++) {
            if (rejilla[f][c].estaViva) {
                ctx.fillStyle = "#00ffff"; 
                ctx.fillRect(c * tamanoCelda, f * tamanoCelda, tamanoCelda - 1, tamanoCelda - 1);
            } else {
                ctx.strokeStyle = "#001525";
                ctx.strokeRect(c * tamanoCelda, f * tamanoCelda, tamanoCelda, tamanoCelda);
            }
        }
    }

    if (seleccionando) {
        ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            inicioSeleccion.x * tamanoCelda, 
            inicioSeleccion.y * tamanoCelda, 
            (finSeleccion.x - inicioSeleccion.x) * tamanoCelda, 
            (finSeleccion.y - inicioSeleccion.y) * tamanoCelda
        );
        ctx.setLineDash([]);
    }
    actualizarEstadoUI();
}

// --- INTERACCIÓN CON EL MOUSE ---
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / tamanoCelda);
    const y = Math.floor((e.clientY - rect.top) / tamanoCelda);

    // Caso 1: Estamos esperando para pegar un patrón
    if (esperandoPegado) {
        ejecutarPegado(x, y);
        return;
    }

    // Caso 2: Captura de área con SHIFT
    if (e.shiftKey) {
        seleccionando = true;
        inicioSeleccion = { x, y };
        finSeleccion = { x, y };
    } 
    // Caso 3: Alternar celda individual
    else {
        if (rejilla[y] && rejilla[y][x]) {
            rejilla[y][x].alternar();
            dibujar();
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (seleccionando) {
        const rect = canvas.getBoundingClientRect();
        finSeleccion = { 
            x: Math.floor((e.clientX - rect.left) / tamanoCelda), 
            y: Math.floor((e.clientY - rect.top) / tamanoCelda) 
        };
        dibujar();
    }
});

window.addEventListener('mouseup', () => {
    if (seleccionando) {
        capturarArea();
        seleccionando = false;
        dibujar();
    }
});

// --- LÓGICA DE SUB-SECTORES ---
function capturarArea() {
    const xInicio = Math.min(inicioSeleccion.x, finSeleccion.x);
    const xFin = Math.max(inicioSeleccion.x, finSeleccion.x);
    const yInicio = Math.min(inicioSeleccion.y, finSeleccion.y);
    const yFin = Math.max(inicioSeleccion.y, finSeleccion.y);

    patronCapturado = [];
    for (let f = yInicio; f <= yFin; f++) {
        let datosFila = [];
        for (let c = xInicio; c <= xFin; c++) {
            datosFila.push(rejilla[f][c].estaViva);
        }
        patronCapturado.push(datosFila);
    }
    console.log("Sector capturado.");
}

function activarModoPegado() {
    if (!patronCapturado) {
        alert("PRIMERO CAPTURA UN ÁREA (SHIFT + ARRASTRAR)");
        return;
    }
    esperandoPegado = true;
    document.getElementById('sim-status').innerText = "ASIGNANDO POSICIÓN...";
    canvas.style.cursor = "copy";
}

function ejecutarPegado(xOrigen, yOrigen) {
    for (let f = 0; f < patronCapturado.length; f++) {
        for (let c = 0; c < patronCapturado[f].length; c++) {
            let fDestino = yOrigen + f;
            let cDestino = xOrigen + c;
            
            // Verificamos que no se salga de los bordes del canvas
            if (fDestino < filas && cDestino < columnas) {
                rejilla[fDestino][cDestino].estaViva = patronCapturado[f][c];
            }
        }
    }
    esperandoPegado = false;
    canvas.style.cursor = "crosshair";
    document.getElementById('sim-status').innerText = enEjecucion ? "EJECUTANDO" : "PAUSADO";
    dibujar();
}

// --- LÓGICA CONWAY ---
function calcularSiguienteGen() {
    const nuevaRejilla = rejilla.map(fila => fila.map(celda => celda.clonar()));

    for (let f = 0; f < filas; f++) {
        for (let c = 0; c < columnas; c++) {
            let vecinos = contarVecinos(f, c);
            if (rejilla[f][c].estaViva) {
                if (vecinos < 2 || vecinos > 3) nuevaRejilla[f][c].estaViva = false;
            } else {
                if (vecinos === 3) nuevaRejilla[f][c].estaViva = true;
            }
        }
    }
    rejilla = nuevaRejilla;
    dibujar();
}

function contarVecinos(f, c) {
    let cuenta = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            let fila = (f + i + filas) % filas;
            let col = (c + j + columnas) % columnas;
            if (rejilla[fila][col].estaViva) cuenta++;
        }
    }
    return cuenta;
}

// --- GESTIÓN DE LOCALSTORAGE ---
function guardarPartidaLocal() {
    const nombre = document.getElementById('nombre-partida').value.trim();
    if (!nombre) return alert("INGRESE IDENTIFICADOR DE MISIÓN");

    const datos = rejilla.map(fila => fila.map(c => c.estaViva));
    const partidas = JSON.parse(localStorage.getItem('conway_tno_saves') || '{}');
    
    partidas[nombre] = datos;
    localStorage.setItem('conway_tno_saves', JSON.stringify(partidas));
    
    document.getElementById('nombre-partida').value = "";
    actualizarListaPartidas();
}

function cargarPartidaLocal() {
    const nombre = document.getElementById('lista-partidas').value;
    if (!nombre) return;

    const partidas = JSON.parse(localStorage.getItem('conway_tno_saves') || '{}');
    const datos = partidas[nombre];

    if (datos) {
        rejilla = datos.map(fila => fila.map(viva => new Celda(viva)));
        dibujar();
    }
}

function eliminarPartidaLocal() {
    const nombre = document.getElementById('lista-partidas').value;
    if (!nombre) return;

    const partidas = JSON.parse(localStorage.getItem('conway_tno_saves') || '{}');
    delete partidas[nombre];
    localStorage.setItem('conway_tno_saves', JSON.stringify(partidas));
    actualizarListaPartidas();
}

function actualizarListaPartidas() {
    const lista = document.getElementById('lista-partidas');
    const partidas = JSON.parse(localStorage.getItem('conway_tno_saves') || '{}');
    lista.innerHTML = "";
    
    Object.keys(partidas).forEach(nombre => {
        const opt = document.createElement('option');
        opt.value = nombre;
        opt.textContent = nombre;
        lista.appendChild(opt);
    });
}

// --- CONTROLES UI ---
function alternarSimulacion() {
    enEjecucion = !enEjecucion;
    const btn = document.getElementById('btn-play');
    const estado = document.getElementById('sim-status');
    
    if (enEjecucion) {
        btn.innerHTML = '<i class="fas fa-pause"></i>';
        estado.innerText = "EJECUTANDO";
        intervaloSim = setInterval(calcularSiguienteGen, velocidad);
    } else {
        btn.innerHTML = '<i class="fas fa-play"></i>';
        estado.innerText = "PAUSADO";
        clearInterval(intervaloSim);
    }
}

function actualizarVelocidad() {
    velocidad = document.getElementById('control-velocidad').value;
    if (enEjecucion) {
        clearInterval(intervaloSim);
        intervaloSim = setInterval(calcularSiguienteGen, velocidad);
    }
}

function limpiarRejilla() {
    rejilla.forEach(f => f.forEach(c => c.estaViva = false));
    dibujar();
}

function actualizarEstadoUI() {
    const cuenta = rejilla.flat().filter(c => c.estaViva).length;
    document.getElementById('conteo-celulas').innerText = cuenta;
}

window.onload = inicializar;