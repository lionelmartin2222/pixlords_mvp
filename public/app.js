/* ========================= app.js: VERSIÓN 5.0 COMPLETA ========================= */

// --- CONFIGURACIÓN DEL MAPA ---
const WIDTH = 500; // Ancho lógico del mapa
const HEIGHT = 200; // Alto lógico del mapa
const TOTAL_PIXELS = WIDTH * HEIGHT;
const MAP_CONTAINER_ID = 'pixel-map-container';

// --- ESTADO GLOBAL Y CONFIGURACIÓN CRÍTICA (PLACEHOLDERS DE BLOCKCHAIN) ---
// *** REEMPLAZAR ESTAS VARIABLES CON LOS ENTREGABLES DE MUHAMMAD ***
const CONTRACT_ADDRESS = "DIRECCION_DE_CONTRATO_AQUI"; 
const PIXEL_CONTRACT_ABI = [/* PEGAR EL JSON ABI COMPLETO AQUÍ */]; 
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a922Aa845041"; // USDC en Polygon

const INITIAL_PRICE_USDC = 1.00; // Precio fijo de compra inicial
let selectedPixels = new Set(); 
let mapData = []; 
let currentAccount = null; 
let currentPixel = { x: null, y: null }; 

// --- FUNCIÓN DE COORDENADAS AMIGABLES ---
const COORD_MAP_TO_UI = (x, y) => {
    let colStr = '';
    let i = x;
    while (i >= 0) {
        colStr = String.fromCharCode(i % 26 + 'A'.charCodeAt(0)) + colStr;
        i = Math.floor(i / 26) - 1;
    }
    const rowStr = y + 1; 
    return `${colStr}-${rowStr}`;
};

// =========================================================
// PARTE I: SIMULACIÓN DE DATOS (Geografía y Propiedad)
// =========================================================

// Función de Simulación de Mapa (Geografía más compleja)
function getInitialMapColor(x, y) {
    const LAND_COLOR = '#008000'; // Tierra
    const WATER_COLOR = '#0000FF'; // Mar
    const RIVER_BORDER = '#582C0E'; // Frontera/Río

    const relY = y;
    const relX = x;

    // Patrón de píxeles para simular una masa continental compleja
    const isLand = 
        (relX > 20 && relX < 150 && relY > 30 && relY < 180) ||
        (relX > 200 && relX < 480 && relY > 10 && relY < 170) ||
        (relX > 380 && relX < 450 && relY > 100 && relY < 160) ||
        (relY > 185 && relX % 5 === 0); 
    
    const isIsland = (relX % 37 === 0 && relY % 13 === 0);
    const isCoastline = (relX % 5 === 0 || relY % 5 === 0);

    if (isLand || isIsland) {
        // Simular un lago interior (Ojo de agua, ej. Asia Central)
        if (relX > 300 && relX < 350 && relY > 50 && relY < 90) {
            return WATER_COLOR;
        }

        // Simular costas con color diferente
        if (isCoastline && !isIsland && (relX < 20 || relX > 470)) {
            return LAND_BROWN;
        }

        return LAND_COLOR;
    }
    
    return WATER_COLOR; 
}


// Inicializa los datos simulados (Corregido el precio por defecto y el propietario)
function initializeMapData() {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const index = y * WIDTH + x;
            const color = getInitialMapColor(x, y);
            
            // LÓGICA CORREGIDA: 15% de probabilidad de estar ocupado si es tierra
            const isOwned = (color !== '#0000FF') && (Math.random() > 0.85); 
            const owner = isOwned ? '0xAbcD...1234' : 'Nadie'; 
            
            // PRECIO CORREGIDO: 1.00 si libre, 1.50 si ocupado (simulación reventa)
            const price = isOwned ? 1.50 : INITIAL_PRICE_USDC; 

            mapData[index] = {
                x,
                y,
                color: color,
                owner: owner,
                price: price,
                isOwned: isOwned
            };
        }
    }
}

// =========================================================
// PARTE II: RENDERING Y EVENTOS (Frontend)
// =========================================================

function renderMap() {
    const mapContainer = document.querySelector(`#${MAP_CONTAINER_ID} > div`);
    mapContainer.innerHTML = ''; 

    mapData.forEach(pixel => {
        const pixelElement = document.createElement('div');
        pixelElement.className = 'pixel';
        pixelElement.style.backgroundColor = pixel.color;
        
        if (pixel.isOwned) {
            pixelElement.setAttribute('data-owner-status', 'owned');
        }

        pixelElement.dataset.x = pixel.x;
        pixelElement.dataset.y = pixel.y;

        // Añadir listeners para clic izquierdo (modal) y clic derecho (selección de lote)
        pixelElement.addEventListener('click', handlePixelClick);
        pixelElement.addEventListener('contextmenu', handlePixelRightClick); 

        mapContainer.appendChild(pixelElement);
    });
}

// Lógica de clic izquierdo (o modal)
function handlePixelClick(event) {
    const pixelElement = event.target;
    const x = parseInt(pixelElement.dataset.x);
    const y = parseInt(pixelElement.dataset.y);
    const index = y * WIDTH + x;
    const pixel = mapData[index];

    showModal(pixel, pixelElement);
}

// Lógica de clic derecho (o lote)
function handlePixelRightClick(event) {
    const targetElement = event.target || event; 
    
    if (event.preventDefault) {
        event.preventDefault(); 
    }
    
    const pixelElement = targetElement;
    const x = parseInt(pixelElement.dataset.x);
    const y = parseInt(pixelElement.dataset.y);
    const id = `${x},${y}`;
    const pixel = mapData[y * WIDTH + x];

    if (!pixel.isOwned) {
        if (selectedPixels.has(id)) {
            selectedPixels.delete(id);
            pixelElement.classList.remove('selected');
        } else {
            selectedPixels.add(id);
            pixelElement.classList.add('selected');
        }
        updateCartSummary();
    } else {
        if (event.preventDefault) { 
            alert("Este píxel está ocupado o en venta. Click izquierdo para ver detalles.");
        }
    }
}

function updateCartSummary() {
    const count = selectedPixels.size;
    const totalCost = count * INITIAL_PRICE_USDC; 
    
    document.getElementById('cart-summary').textContent = 
        `Cesta: ${count} píxeles seleccionados | Total: ${totalCost.toFixed(2)} USDC`;
        
    document.getElementById('pay-batch-btn').disabled = count === 0;
}

function clearCart() {
    selectedPixels.forEach(id => {
        const [x, y] = id.split(',').map(Number);
        const element = document.querySelector(`.pixel[data-x="${x}"][data-y="${y}"]`);
        if (element) {
            element.classList.remove('selected');
        }
    });
    selectedPixels.clear();
    updateCartSummary();
}


function showModal(pixel, element) {
    document.getElementById('modal-coords').textContent = `(X:${pixel.x}, Y:${pixel.y})`;
    document.getElementById('modal-price').textContent = `${pixel.price.toFixed(2)} USDC`;
    document.getElementById('modal-owner').textContent = pixel.owner;
    document.getElementById('modal-color-display').textContent = pixel.color;
    
    // Asumimos que si la billetera está conectada y es la simulación, eres el dueño
    const isUserOwner = (pixel.owner === '0xAbcD...1234'); 

    // Botones
    document.getElementById('owner-controls').style.display = isUserOwner ? 'block' : 'none'; 
    const buyBtn = document.getElementById('buy-pixel-btn');

    if (!pixel.isOwned) {
        // Píxel libre: Botón para añadir a la cesta (lote)
        buyBtn.textContent = 'AÑADIR A CESTA (Lote)';
        buyBtn.onclick = () => {
            handlePixelRightClick({ preventDefault: () => {}, target: element });
            document.getElementById('modal-backdrop').style.display = 'none';
        };
    } else {
        // Píxel ocupado/en venta: Botón para compra individual (reventa)
        buyBtn.textContent = `COMPRAR (Reventa) por ${pixel.price.toFixed(2)} USDC`;
        buyBtn.onclick = () => {
            alert(`Simulación de Compra Individual/Reventa. Precio: ${pixel.price.toFixed(2)} USDC.`);
            // **AQUÍ IRÁ LA LLAMADA FINAL AL SMART CONTRACT**
            document.getElementById('modal-backdrop').style.display = 'none';
        };
    }

    document.getElementById('modal-backdrop').style.display = 'flex';
}

function hideModal() {
    document.getElementById('modal-backdrop').style.display = 'none';
}

// =========================================================
// PARTE III: CONEXIÓN REAL A BLOCKCHAIN (PLACEHOLDERS)
// =========================================================

// Estas funciones serán implementadas con el ABI de Muhammad.
// Actualmente son solo simulaciones.

function connectWallet() {
    const statusMessage = document.getElementById('status-message');
    const connectBtn = document.getElementById('connect-wallet');
    
    setTimeout(() => {
        // SIMULACIÓN DE CUENTA CONECTADA
        currentAccount = '0xAbCdEfGhIjKlMnOpQrStUvWxYz0123456789aB'.toLowerCase();
        statusMessage.textContent = `Conectado: ${currentAccount.substring(0, 6)}...`;
        connectBtn.textContent = 'Desconectar';
        statusMessage.style.color = '#39FF14'; 
        connectBtn.onclick = disconnectWallet;
        alert("Simulación de conexión exitosa a MetaMask.");
        // Después de conectar, se simula una actualización de la visual
        // En la versión real, se llamaría a refreshMapVisuals()
    }, 500);
}

function disconnectWallet() {
    currentAccount = null;
    const statusMessage = document.getElementById('status-message');
    const connectBtn = document.getElementById('connect-wallet');
    
    statusMessage.textContent = 'Desconectado';
    connectBtn.textContent = 'Conectar Billetera (MetaMask)';
    statusMessage.style.color = '#FDFD96'; 
    connectBtn.onclick = connectWallet;
}

function executeBatchPurchase() {
    if (selectedPixels.size > 0) {
        // **AQUÍ IRÁ LA LLAMADA REAL AL SMART CONTRACT buyMultiplePixels**
        alert(`Simulación de COMPRA POR LOTE de ${selectedPixels.size} píxeles. ¡Llamando al Smart Contract!`);
        clearCart();
    }
}

// --- INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    initializeMapData();
    renderMap();
    
    // Conectar botones principales
    document.getElementById('connect-wallet').addEventListener('click', connectWallet);
    document.getElementById('pay-batch-btn').addEventListener('click', executeBatchPurchase);
    document.getElementById('clear-cart-btn').addEventListener('click', clearCart);
    document.getElementById('close-modal-btn').addEventListener('click', hideModal);
    
    // Conectar botones de Dueño (SIMULADO)
    document.getElementById('set-color-btn').addEventListener('click', () => {
        const newColor = document.getElementById('new-color').value;
        alert(`Simulación: Cambiando color a ${newColor}.`);
        hideModal();
    });
    
    document.getElementById('sell-pixel-btn').addEventListener('click', () => {
        const newPrice = document.getElementById('new-price').value;
        alert(`Simulación: Poniendo píxel en venta por ${newPrice} USDC.`);
        hideModal();
    });
});
