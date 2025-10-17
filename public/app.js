/* ========================= app.js: VERSIÓN 8.0 FINAL FUNCIONAL Y ESTÉTICA ========================= */

// --- CONFIGURACIÓN DEL MAPA ---
const WIDTH = 500; 
const HEIGHT = 200; 
const TOTAL_PIXELS = WIDTH * HEIGHT;
const MAP_CONTAINER_ID = 'pixel-map-container';

// --- ESTADO GLOBAL Y CONFIGURACIÓN CRÍTICA (PLACEHOLDERS DE BLOCKCHAIN) ---
const INITIAL_PRICE_USDC = 1.00; 
let selectedPixels = new Set(); 
let mapData = []; 
let currentAccount = null; 
let currentPixel = { x: null, y: null }; 
let provider, signer, pixelContract; 

// *** REEMPLAZAR ESTAS VARIABLES CON LOS ENTREGABLES DE MUHAMMAD CUANDO LLEGUEN ***
const CONTRACT_ADDRESS = "DIRECCION_DE_CONTRATO_AQUI"; 
const PIXEL_CONTRACT_ABI = []; 
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a922Aa845041"; 

// --- COLORES FINALES DE LA UI ---
const LAND_COLOR = '#008000'; // Tierra
const SEA_COLOR = '#0000FF'; // Mar

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
// PARTE I: SIMULACIÓN GEOGRÁFICA (MAPA ORGÁNICO)
// =========================================================

// Esta función genera un mapa irregular con una masa continental central
function getInitialMapColor(x, y) {
    const centerX = WIDTH / 2; 
    const centerY = HEIGHT / 2; 
    
    // Coeficientes que definen la forma general (más ancha que alta)
    const factorX = 0.5; 
    const factorY = 0.8;
    
    // Distancia elíptica desde el centro (para una forma más orgánica)
    const dist = Math.sqrt(
        Math.pow((x - centerX) / factorX, 2) + 
        Math.pow((y - centerY) / factorY, 2)
    );

    // Ruido: Añade irregularidad a los bordes (como costas)
    // Se usa el seno y el coseno para generar ondulaciones naturales
    const noise = Math.sin(x * 0.05) * 10 + Math.cos(y * 0.08) * 10;
    
    // El radio base del continente, ajustado por el ruido
    const baseRadius = 400;

    // Simulación de un lago interior (un área de agua dentro de la tierra)
    const isLake = (x > 180 && x < 320 && y > 80 && y < 120);
    const lakeDist = Math.sqrt(Math.pow(x - 250, 2) + Math.pow(y - 100, 2));

    let color = SEA_COLOR;
    
    if (dist < (baseRadius + noise)) {
        color = LAND_COLOR;
        
        // Si es tierra y cae dentro del área del lago, es agua
        if (isLake && lakeDist < 60) {
            color = SEA_COLOR;
        }
    }
    
    // Simulación de pequeñas islas aleatorias (para romper la uniformidad del mar)
    if (Math.random() < 0.001) { 
        if (color === SEA_COLOR) {
            color = LAND_COLOR;
        }
    }
    
    return color; 
}


// Inicializa los datos (Hard Reset: Todos Libres)
function initializeMapData() {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const index = y * WIDTH + x;
            const color = getInitialMapColor(x, y);
            
            // LÓGICA DE PROPIEDAD DE LANZAMIENTO: TODOS LIBRES
            const isOwned = false; 
            const owner = 'Nadie'; 
            const price = INITIAL_PRICE_USDC; 

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
    const mapContainer = document.getElementById(MAP_CONTAINER_ID); 
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

        pixelElement.addEventListener('click', handlePixelClick);
        pixelElement.addEventListener('contextmenu', handlePixelRightClick); 

        mapContainer.appendChild(pixelElement);
    });
}

function handlePixelClick(event) {
    const pixelElement = event.target;
    const x = parseInt(pixelElement.dataset.x);
    const y = parseInt(pixelElement.dataset.y);
    const index = y * WIDTH + x;
    const pixel = mapData[index];

    showModal(pixel, pixelElement);
}

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
    
    const isUserOwner = (pixel.owner === '0xAbcD...1234'); 

    document.getElementById('owner-controls').style.display = isUserOwner ? 'block' : 'none'; 
    const buyBtn = document.getElementById('buy-pixel-btn');

    if (!pixel.isOwned) {
        buyBtn.textContent = 'AÑADIR A CESTA (Lote)';
        buyBtn.onclick = () => {
            handlePixelRightClick({ preventDefault: () => {}, target: element });
            document.getElementById('modal-backdrop').style.display = 'none';
        };
    } else {
        buyBtn.textContent = `COMPRAR (Reventa) por ${pixel.price.toFixed(2)} USDC`;
        buyBtn.onclick = () => {
            alert(`Simulación de Compra Individual/Reventa. Precio: ${pixel.price.toFixed(2)} USDC.`);
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
        alert(`Simulación de COMPRA POR LOTE de ${selectedPixels.size} píxeles. ¡Llamando al Smart Contract!`);
        clearCart();
    }
}

// --- INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    initializeMapData();
    renderMap();
    
    document.getElementById('connect-wallet').addEventListener('click', connectWallet);
    document.getElementById('pay-batch-btn').addEventListener('click', executeBatchPurchase);
    document.getElementById('clear-cart-btn').addEventListener('click', clearCart);
    document.getElementById('close-modal-btn').addEventListener('click', hideModal);
    
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
