/* ========================= app.js: VERSIÓN 6.0 (CORRECCIÓN DE RENDERIZADO) ========================= */

// --- CONFIGURACIÓN DEL MAPA ---
const WIDTH = 500; // Ancho lógico
const HEIGHT = 200; // Alto lógico
const TOTAL_PIXELS = WIDTH * HEIGHT;
const MAP_CONTAINER_ID = 'pixel-map-container';

// --- ESTADO GLOBAL Y CONFIGURACIÓN CRÍTICA (PLACEHOLDERS DE BLOCKCHAIN) ---
const INITIAL_PRICE_USDC = 1.00; 
let selectedPixels = new Set(); 
let mapData = []; 
let currentAccount = null; 
let currentPixel = { x: null, y: null }; 

// =========================================================
// FUNCIÓN CORREGIDA: Simulación Geográfica Orgánica (Ruido y Seno)
// =========================================================

function getInitialMapColor(x, y) {
    const LAND_COLOR = '#008000'; // Tierra
    const WATER_COLOR = '#0000FF'; // Mar
    const COAST_COLOR = '#582C0E'; // Frontera/Costa (Para textura)

    const centerX = WIDTH / 2; // 250
    const centerY = HEIGHT / 2; // 100
    
    // 1. Crear una base continental centrada (forma elíptica, no rectangular)
    // Coeficientes para hacer la forma más ancha que alta (500x200)
    const factorX = 0.45; 
    const factorY = 0.9;
    
    // Distancia al centro, ponderada para crear una elipse
    const dist = Math.sqrt(
        Math.pow((x - centerX) / factorX, 2) + 
        Math.pow((y - centerY) / factorY, 2)
    );

    // 2. Aplicar Ruido (Irregularidad)
    // El ruido hace que los bordes sean irregulares. Usamos el seno para añadir ondulaciones.
    const noise = Math.sin(x * 0.05) * 5 + Math.sin(y * 0.05) * 5;
    
    // 3. Crear Islas Aleatorias
    const isIsland = (Math.random() < 0.0005) && (x > 10 && x < 490);

    // 4. Determinar la Tierra
    // Si la distancia está dentro de 450 (la base) + el ruido, es tierra
    if (dist < (450 + noise) || isIsland) {
        
        // Simular Lago Interior Grande (Ejemplo: en la mitad derecha del mapa)
        if (x > 300 && y > 50 && y < 150 && Math.sqrt(Math.pow(x - 370, 2) + Math.pow(y - 100, 2)) < 50) {
            return WATER_COLOR;
        }

        // Simular textura de ríos/fronteras (solo para el color, no funcionalidad)
        if (x % 30 === 0 || y % 15 === 0) {
            return COAST_COLOR;
        }
        
        return LAND_COLOR;
    }
    
    // 5. Océano
    return WATER_COLOR; 
}

function initializeMapData() {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const index = y * WIDTH + x;
            const color = getInitialMapColor(x, y);
            
            const isOwned = (color !== '#0000FF') && (Math.random() > 0.85); 
            const owner = isOwned ? '0xAbcD...1234' : 'Nadie'; 
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
    // === CORRECCIÓN CLAVE: APUNTAR AL CONTENEDOR PRINCIPAL (#pixel-map-container) ===
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
