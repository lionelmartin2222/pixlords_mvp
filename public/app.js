/* ========================= app.js: VERSIÓN 8.1 - ZOOM IMPLANTADO ========================= */

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

// --- COLORES FINALES DE LA UI ---\nconst LAND_COLOR = '#008000'; // Tierra\nconst SEA_COLOR = '#0000FF'; // Mar\n\n// --- FUNCIÓN DE COORDENADAS AMIGABLES ---\nconst COORD_MAP_TO_UI = (x, y) => {\n    let colStr = '';\n    let i = x;\n    while (i >= 0) {\n        colStr = String.fromCharCode(i % 26 + 'A'.charCodeAt(0)) + colStr;\n        i = Math.floor(i / 26) - 1;\n    }\n    const rowStr = y + 1; \n    return `${colStr}-${rowStr}`;\n};

// =========================================================
// INICIO DE LA LÓGICA DE ZOOM Y PANORÁMICA (NUEVO CÓDIGO)
// =========================================================

// Estado de Zoom/Panorámica
let scale = 1.0; 
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastX, lastY;
let dragStartX = 0; 
let dragStartY = 0;
let mapContainer; // Referencia al div principal del mapa

function updateTransform() {
    if (!mapContainer) return;
    // Aplicar el zoom/pan al contenedor del mapa usando CSS transform
    mapContainer.style.transform = `scale(${scale})`;
    // Ajuste de posición (panorámica)
    mapContainer.style.transformOrigin = '0 0'; // Cambiado a 0 0 para simplificar el cálculo del arrastre
    mapContainer.style.left = `${offsetX}px`; 
    mapContainer.style.top = `${offsetY}px`;
}

function startDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    
    isDragging = true;
    lastX = event.clientX || event.touches[0].clientX;
    lastY = event.clientY || event.touches[0].clientY;
    
    dragStartX = lastX; 
    dragStartY = lastY;
    
    mapContainer.style.cursor = 'grabbing';
    event.preventDefault(); 
}

function endDrag(event) {
    const CLICK_THRESHOLD = 5; 
    
    if (isDragging) {
        isDragging = false;
        mapContainer.style.cursor = 'grab';

        const finalX = event.clientX || (event.changedTouches ? event.changedTouches[0].clientX : lastX);
        const finalY = event.clientY || (event.changedTouches ? event.changedTouches[0].clientY : lastY);
        
        const dx = Math.abs(finalX - dragStartX);
        const dy = Math.abs(finalY - dragStartY);

        // Si no fue un arrastre significativo, manejarlo como clic (llamando a la función original)
        if (dx < CLICK_THRESHOLD && dy < CLICK_THRESHOLD) {
            const pixelElement = event.target.closest('.pixel');
            if (pixelElement) {
                // Simula el evento de click original para no romper la lógica existente
                handlePixelClick({ target: pixelElement, preventDefault: () => {} }); 
            }
        }
    }
}

function drag(event) {
    if (!isDragging || !mapContainer) return;
    
    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;

    const dx = clientX - lastX;
    const dy = clientY - lastY;

    // Actualizar offsets de panorámica
    offsetX += dx;
    offsetY += dy;

    lastX = clientX;
    lastY = clientY;

    updateTransform();
}

function zoom(event) {
    event.preventDefault(); 
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;

    scale *= zoomFactor;
    scale = Math.max(0.5, Math.min(5.0, scale)); // Límite de Zoom

    updateTransform();
}

// =========================================================
// FIN DE LA LÓGICA DE ZOOM Y PANORÁMICA
// =========================================================


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
    mapContainer = document.getElementById(MAP_CONTAINER_ID); // <--- Asignación de la variable global aquí
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

        // Se reemplaza el listener de click y se usa mousedown y mouseup para manejar el arrastre
        // pixelElement.addEventListener('click', handlePixelClick); <-- ELIMINADO
        
        pixelElement.addEventListener('contextmenu', handlePixelRightClick); 

        mapContainer.appendChild(pixelElement);
    });
    
    // ==============================================
    // IMPLANTACIÓN CRÍTICA DE EVENTOS DE MOUSE
    // ==============================================
    mapContainer.addEventListener('mousedown', startDrag);
    mapContainer.addEventListener('mouseup', endDrag);
    mapContainer.addEventListener('mousemove', drag);
    mapContainer.addEventListener('mouseleave', endDrag);
    mapContainer.addEventListener('wheel', zoom);
    // ==============================================
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
