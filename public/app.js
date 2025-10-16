/* ========================= app.js: VERSIÓN FINAL CON SIMULACIÓN GEOGRÁFICA Y LÓGICA DE CESTA MEJORADA ========================= */

// --- CONFIGURACIÓN DEL MAPA (NO MODIFICAR ESTAS CONSTANTES) ---
const WIDTH = 500; // Ancho lógico del mapa
const HEIGHT = 200; // Alto lógico del mapa
const TOTAL_PIXELS = WIDTH * HEIGHT;
const MAP_CONTAINER_ID = 'pixel-map-container';

// --- ESTADO GLOBAL ---
let selectedPixels = new Set(); // Conjunto de píxeles seleccionados para compra por lote
let mapData = []; // Almacenará el estado (color, dueño, precio) de cada píxel

// --- SIMULACIÓN INICIAL (REEMPLAZAR POR LLAMADAS A SMART CONTRACT) ---

// Función de Simulación de Mapa (Geografía más compleja)
function getInitialMapColor(x, y) {
    const LAND_COLOR = '#008000'; // Verde (Tierra)
    const WATER_COLOR = '#0000FF'; // Azul (Agua)
    const RIVER_BORDER = '#582C0E'; // Marrón (Simulación de río o borde)
    
    // Coordenadas relativas (0 a 199)
    const relY = y;
    const relX = x;

    // 1. Masa Continental Principal (Tierra central)
    const isCentralLand = (relX > 50 && relX < 450 && relY > 20 && relY < 180);

    if (isCentralLand) {
        
        // 1a. Simulación de un Gran Lago Central (Ojo de agua)
        if (relX > 150 && relX < 350 && relY > 60 && relY < 140) {
            
            // Simulación de una isla dentro del lago
            if (relX > 220 && relX < 280 && relY > 90 && relY < 110) {
                 return LAND_COLOR;
            }

            return WATER_COLOR;
        }

        // 1b. Simulación de costa irregular (para que no sea un bloque perfecto)
        if (relX % 2 === 0 && relY % 3 === 0 && (relX < 60 || relX > 440)) {
            return WATER_COLOR;
        }

        // 1c. Simulación de fronteras/ríos internos (líneas marrones)
        // Patrón de cuadrícula tenue para dar textura
        if ((relX % 20 === 0) || (relY % 20 === 0)) {
            // Evitar que las líneas pasen por el lago
            if (! (relX > 150 && relX < 350 && relY > 60 && relY < 140)) {
                 return RIVER_BORDER;
            }
        }
        
        return LAND_COLOR;
    }
    
    // 2. Océano y Borde Exterior
    return WATER_COLOR; 
}


// Inicializa los datos simulados
function initializeMapData() {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const index = y * WIDTH + x;
            const color = getInitialMapColor(x, y);
            
            // Simulación: los píxeles de agua (blue) no tienen dueño ni están en venta
            // Los píxeles de tierra (verde o marrón) son propiedad de una billetera simulada (simulando que alguien ya los compró)
            const isOwned = (color !== '#0000FF'); 
            const owner = isOwned ? '0xAbcD...1234' : 'Nadie'; 
            const price = isOwned ? 1.50 : 1.00; // Si ya tiene dueño, es más caro

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

// --- RENDERING ---

function renderMap() {
    const mapContainer = document.querySelector(`#${MAP_CONTAINER_ID} > div`);
    mapContainer.innerHTML = ''; // Limpiar mapa anterior

    mapData.forEach(pixel => {
        const pixelElement = document.createElement('div');
        pixelElement.className = 'pixel';
        pixelElement.style.backgroundColor = pixel.color;
        
        // Atributo para micro-interacción de CSS: indica si está poseído
        if (pixel.isOwned) {
            pixelElement.setAttribute('data-owner-status', 'owned');
        }

        // Atributos de datos (coordenadas lógicas)
        pixelElement.dataset.x = pixel.x;
        pixelElement.dataset.y = pixel.y;

        // Añadir listeners
        pixelElement.addEventListener('click', handlePixelClick);
        pixelElement.addEventListener('contextmenu', handlePixelRightClick); // Para selección por lote

        mapContainer.appendChild(pixelElement);
    });
}

// --- EVENTOS DEL USUARIO ---

function handlePixelClick(event) {
    const pixelElement = event.target;
    const x = parseInt(pixelElement.dataset.x);
    const y = parseInt(pixelElement.dataset.y);
    const index = y * WIDTH + x;
    const pixel = mapData[index];

    // Mostrar modal con información del píxel
    showModal(pixel, pixelElement);
}

// Lógica de clic derecho (o lote)
function handlePixelRightClick(event) {
    // Verificar si el evento es un objeto de Evento o si fue llamado desde showModal
    const targetElement = event.target || event; 
    
    // Si fue llamado desde showModal, la función no tiene preventDefault
    if (event.preventDefault) {
        event.preventDefault(); // Prevenir el menú contextual del navegador
    }
    
    const pixelElement = targetElement;
    const x = parseInt(pixelElement.dataset.x);
    const y = parseInt(pixelElement.dataset.y);
    const id = `${x},${y}`;
    const pixel = mapData[y * WIDTH + x];

    // Lógica de selección para compra por lote (solo si no tiene dueño simulado)
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
        // Solo alertar si el evento fue un clic derecho real (no una llamada desde modal)
        if (event.preventDefault) { 
            alert("Este píxel está ocupado o en venta. Click izquierdo para ver detalles.");
        }
    }
}

function updateCartSummary() {
    const count = selectedPixels.size;
    const totalCost = count * 1.00; // Asumimos 1 USDC por píxel para compra inicial
    
    document.getElementById('cart-summary').textContent = 
        `Cesta: ${count} píxeles seleccionados | Total: ${totalCost.toFixed(2)} USDC`;
        
    // Habilitar el botón de pagar lote si hay selecciones
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

// --- FUNCIONALIDAD DEL MODAL ---

function showModal(pixel, element) {
    document.getElementById('modal-coords').textContent = `(X:${pixel.x}, Y:${pixel.y})`;
    document.getElementById('modal-price').textContent = `${pixel.price.toFixed(2)} USDC`;
    document.getElementById('modal-owner').textContent = pixel.owner;
    document.getElementById('modal-color-display').textContent = pixel.color;
    
    // Aquí iría la lógica de si el propietario es el usuario conectado
    const isUserOwner = (pixel.owner === '0xAbcD...1234'); // SIMULACIÓN

    // Controles de compra y propietario
    document.getElementById('buy-controls').style.display = 'flex'; // Siempre visible
    document.getElementById('owner-controls').style.display = isUserOwner ? 'block' : 'none'; // Mostrar si es tu píxel

    
    // LÓGICA DE BOTÓN DE ACCIÓN: COMPRA INDIVIDUAL vs. AÑADIR A CESTA
    const buyBtn = document.getElementById('buy-pixel-btn');

    if (!pixel.isOwned) {
        // Píxel libre: Botón para añadir a la cesta (lote)
        buyBtn.textContent = 'AÑADIR A CESTA (Lote)';
        buyBtn.onclick = () => {
            // Llama a la lógica de clic derecho para seleccionarlo (o deseleccionarlo si ya estaba)
            handlePixelRightClick({ preventDefault: () => {}, target: element });
            document.getElementById('modal-backdrop').style.display = 'none';
        };
    } else {
        // Píxel ocupado/en venta: Botón para compra individual (reventa)
        buyBtn.textContent = `COMPRAR (Reventa) por ${pixel.price.toFixed(2)} USDC`;
        buyBtn.onclick = () => {
            alert(`Simulación de Compra Individual/Reventa. El Smart Contract se llamará con la función de reventa.`);
            // Aquí irá la llamada real a executeResaleOrIndividualBuy
            document.getElementById('modal-backdrop').style.display = 'none';
        };
    }

    document.getElementById('modal-backdrop').style.display = 'flex';
}

function hideModal() {
    document.getElementById('modal-backdrop').style.display = 'none';
}

// --- CONEXIÓN A METAMASK (SIMULADA) ---

function connectWallet() {
    // Aquí iría la lógica real de MetaMask/Web3.js
    const statusMessage = document.getElementById('status-message');
    const connectBtn = document.getElementById('connect-wallet');
    
    // SIMULACIÓN: Conexión exitosa
    setTimeout(() => {
        statusMessage.textContent = 'Conectado: 0xAbcD...1234';
        connectBtn.textContent = 'Desconectar';
        statusMessage.style.color = '#39FF14'; // Verde neón para conectado
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


// --- INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar datos del mapa y renderizar
    initializeMapData();
    renderMap();
    
    // 2. Configurar listeners de botones
    document.getElementById('connect-wallet').addEventListener('click', connectWallet);
    document.getElementById('clear-cart-btn').addEventListener('click', clearCart);
    document.getElementById('close-modal-btn').addEventListener('click', hideModal);
    
    // 3. Listener del botón Pagar Lote (SIMULADO)
    document.getElementById('pay-batch-btn').addEventListener('click', () => {
        if (selectedPixels.size > 0) {
            alert(`Simulación: Intentando comprar ${selectedPixels.size} píxeles. \n\n¡Aquí iría la llamada al Smart Contract de Muhammad para compra por lote!`);
            clearCart();
        }
    });

    // 4. Configurar listener del propietario (SIMULADO)
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
