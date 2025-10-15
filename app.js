// ========================= app.js: CÓDIGO FINAL DE CONECTIVIDAD Y LÓGICA DE LOTE =========================

// --- 1. CONFIGURACIÓN DEL CONTRATO (VARIABLES CRÍTICAS - ¡REEMPLAZAR!) ---
const CONTRACT_ADDRESS = "DIRECCION_DE_CONTRATO_AQUI"; // <-- DATO CRÍTICO de Muhammad
const PIXEL_CONTRACT_ABI = [
    // Aquí debe ir el JSON ABI completo de Muhammad (es un array largo)
]; 
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a922Aa845041"; // Dirección USDC en Polygon (fija)

// --- 2. VARIABLES GLOBALES DE ESTADO Y DATOS ---
const WIDTH = 500;
const HEIGHT = 200;
const INITIAL_PRICE_USDC = 1.00; // Precio fijo de compra inicial (píxel vacío)
let provider, signer, pixelContract; // Objetos Web3
let currentAccount = null; // Dirección de la billetera conectada
let selectedPixels = {}; // { "x-y": { x: 1, y: 5, color: '#FFFFFF' }, ... }
let currentPixel = { x: null, y: null }; // Píxel actual seleccionado en el modal

// --- 3. ELEMENTOS DEL DOM ---
const MAP_CONTAINER = document.getElementById('pixel-map-container');
const MODAL_BACKDROP = document.getElementById('modal-backdrop');
const STATUS_MESSAGE = document.getElementById('status-message');
const CART_SUMMARY = document.getElementById('cart-summary');
const CHECKOUT_BUTTON = document.getElementById('checkout-button');
const CLOSE_MODAL_BTN = document.getElementById('close-modal');

// --- 4. FUNCIÓN CRÍTICA DE COORDENADAS AMIGABLES (X-letras, Y-números) ---
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
// PARTE I: CONEXIÓN WEB3 (MetaMask y Red)
// =========================================================

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask no está instalado. Instálalo para usar Pixlords.com.');
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0].toLowerCase(); // Guardamos en minúsculas para comparación
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        pixelContract = new ethers.Contract(CONTRACT_ADDRESS, PIXEL_CONTRACT_ABI, signer);

        STATUS_MESSAGE.textContent = `Conectado: ${currentAccount.substring(0, 6)}...`;
        document.getElementById('connect-wallet').style.display = 'none';

        // Verifica la red
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0x89') { // '0x89' es el ID de la red principal de Polygon
            STATUS_MESSAGE.textContent = "ADVERTENCIA: Cambia tu red a Polygon (MATIC).";
            alert("Por favor, cambia tu billetera a la red Polygon (MATIC) para operar.");
        }

        await refreshMapVisuals();

    } catch (error) {
        console.error("Error al conectar MetaMask:", error);
        STATUS_MESSAGE.textContent = "Error de Conexión.";
    }
}

// =========================================================
// PARTE II: LÓGICA DE COMPRA POR LOTE (Checkout)
// =========================================================

async function executeBatchPurchase() {
    if (Object.keys(selectedPixels).length === 0 || !signer) {
        alert("Selecciona píxeles y conecta tu billetera.");
        return;
    }

    const xCoords = [], yCoords = [], colors = [];
    const numPixels = Object.keys(selectedPixels).length;
    const totalPrice = numPixels * INITIAL_PRICE_USDC; 
    
    // Rellena los arrays para el Smart Contract
    for (const key in selectedPixels) {
        xCoords.push(selectedPixels[key].x);
        yCoords.push(selectedPixels[key].y);
        colors.push(selectedPixels[key].color);
    }
    
    // Convierte el precio total a la unidad de USDC (6 decimales)
    const priceWei = ethers.utils.parseUnits(totalPrice.toString(), 6);
    
    // --- LÓGICA CRÍTICA DE USDC (Aprobación y Compra) ---
    const usdcAbi = [{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"}];
    const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcAbi, signer);

    try {
        STATUS_MESSAGE.textContent = `Paso 1/2: Aprobando ${totalPrice.toFixed(2)} USDC...`;
        const approvalTx = await usdcContract.approve(CONTRACT_ADDRESS, priceWei);
        await approvalTx.wait(); 
        
        STATUS_MESSAGE.textContent = `Paso 2/2: Comprando ${numPixels} píxeles...`;
        // ESTA FUNCIÓN ES LA QUE LE PEDIMOS A MUHAMMAD: buyMultiplePixels
        const buyTx = await pixelContract.buyMultiplePixels(xCoords, yCoords, colors);
        await buyTx.wait();

        alert(`¡COMPRA DE LOTE EXITOSA! ${numPixels} píxeles adquiridos.`);
        
        // Limpiar después de la compra exitosa
        selectedPixels = {};
        updateCartDisplay();
        await refreshMapVisuals();

    } catch (error) {
        console.error("Error durante la transacción:", error);
        alert("Transacción fallida. Verifica saldo y permisos.");
    }
}

// ---------------------------------------------------------
// Lógica de Dueño: Cambiar Color y Fijar Precio (Future-Proof)
// ---------------------------------------------------------

// Implementación placeholder de la compra individual/reventa
async function executeResaleOrIndividualBuy(x, y, priceInUSDC) {
    // ESTA ES LA FUNCIÓN QUE MUHAMMAD HACE COMPLEJA (PAGAR AL VENDEDOR O A LA DEVELEOPER WALLET)
    if (!signer || !pixelContract) {
        alert("¡Primero conecta tu billetera!");
        return;
    }
    // Lógica similar a executeBatchPurchase, pero llamando a pixelContract.buyPixel(x, y, color);
    alert(`Simulando compra/reventa individual de ${COORD_MAP_TO_UI(x, y)} por ${priceInUSDC} USDC. (Lógica en desarrollo)`);
    // ... Código real de transacción aquí ...
}

// Función para Dueño: Cambiar Color
async function executeChangeColor(x, y, newColor) {
    if (!signer || !pixelContract) return;
    try {
        STATUS_MESSAGE.textContent = "Cambiando color del píxel...";
        const tx = await pixelContract.changeColor(x, y, newColor);
        await tx.wait();
        alert(`Color de ${COORD_MAP_TO_UI(x, y)} actualizado.`);
        MODAL_BACKDROP.style.display = 'none';
        await refreshMapVisuals();
    } catch (error) {
        console.error("Error al cambiar color:", error);
        alert("No se pudo cambiar el color (¿Eres el dueño?).");
    }
}

// Función para Dueño: Fijar Precio de Reventa
async function executeSetPrice(x, y, newPrice) {
    if (!signer || !pixelContract || newPrice <= INITIAL_PRICE_USDC) return;
    try {
        STATUS_MESSAGE.textContent = `Fijando precio de reventa a ${newPrice} USDC...`;
        // ESTA ES LA FUNCIÓN QUE LE PEDIMOS A MUHAMMAD: setSalePrice
        const tx = await pixelContract.setSalePrice(x, y, ethers.utils.parseUnits(newPrice.toString(), 6));
        await tx.wait();
        alert(`Precio de reventa de ${COORD_MAP_TO_UI(x, y)} fijado a ${newPrice} USDC.`);
        MODAL_BACKDROP.style.display = 'none';
    } catch (error) {
        console.error("Error al fijar precio:", error);
        alert("No se pudo fijar el precio (¿Eres el dueño?).");
    }
}


// =========================================================
// PARTE III: MAPA Y LÓGICA DE INTERFAZ
// =========================================================

// Función de Simulación de Mapa (Mantiene la función getInitialMapColor)
function getInitialMapColor(x, y) {
    if (y >= 50 && y <= 150 && x >= 50 && x <= 450) {
        if (x % 10 === 0 || y % 10 === 0) return '#582C0E'; 
        return '#008000'; 
    }
    return '#0000FF'; 
}

function generateMap() {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const pixel = document.createElement('div');
            pixel.classList.add('pixel');
            pixel.id = `pixel-${x}-${y}`;
            pixel.dataset.x = x;
            pixel.dataset.y = y;
            pixel.style.backgroundColor = getInitialMapColor(x, y);

            // Dato de estado inicial (se actualizará con refreshMapVisuals)
            pixel.dataset.owner = '0x0000000000000000000000000000000000000000'; 
            pixel.dataset.price = INITIAL_PRICE_USDC.toFixed(2);

            pixel.addEventListener('click', handlePixelClick);
            MAP_CONTAINER.appendChild(pixel);
        }
    }
}

function updateCartDisplay() {
    const count = Object.keys(selectedPixels).length;
    const totalCost = count * INITIAL_PRICE_USDC;
    
    CART_SUMMARY.textContent = `Cesta: ${count} píxeles seleccionados | Total: ${totalCost.toFixed(2)} USDC`;
    CHECKOUT_BUTTON.disabled = count === 0;
}

function handlePixelClick(event) {
    const pixelElement = event.target;
    const x = parseInt(pixelElement.dataset.x);
    const y = parseInt(pixelElement.dataset.y);
    const coordKey = `${x}-${y}`;
    
    // Si la billetera no está conectada, sólo se muestra el modal
    if (!currentAccount) {
        openModal(pixelElement);
        return;
    }

    // --- LÓGICA DE SELECCIÓN PARA COMPRA POR LOTE ---
    const ownerAddress = pixelElement.dataset.owner.toLowerCase();
    const isOwned = ownerAddress !== '0x0000000000000000000000000000000000000000';
    
    if (isOwned) {
        // Si tiene dueño, abre el modal de detalles/reventa/cambio de color
        openModal(pixelElement);
        return;
    }

    // Lógica de SELECCIÓN/DESELECCIÓN para píxeles disponibles
    const isSelected = selectedPixels.hasOwnProperty(coordKey);
    
    if (isSelected) {
        delete selectedPixels[coordKey];
        pixelElement.classList.remove('selected');
    } else {
        selectedPixels[coordKey] = { 
            x: x, 
            y: y, 
            color: document.getElementById('color-picker').value // Color inicial para la compra
        };
        pixelElement.classList.add('selected');
    }
    
    updateCartDisplay();
}

function openModal(pixelElement) {
    const x = parseInt(pixelElement.dataset.x);
    const y = parseInt(pixelElement.dataset.y);
    const ownerAddress = pixelElement.dataset.owner.toLowerCase();
    const isOwned = ownerAddress !== '0x0000000000000000000000000000000000000000';
    const isCurrentUserOwner = currentAccount && ownerAddress === currentAccount;

    // Actualizar variable global del píxel clicado
    currentPixel = { x: x, y: y }; 

    // Rellenar Modal
    document.getElementById('modal-coord').textContent = COORD_MAP_TO_UI(x, y);
    document.getElementById('modal-owner').textContent = isOwned ? ownerAddress.substring(0, 10) + '...' : 'DISPONIBLE';
    document.getElementById('modal-price').textContent = `${pixelElement.dataset.price} USDC`;
    
    // Control de visibilidad de botones
    document.getElementById('add-to-cart-button').style.display = !isOwned && !isCurrentUserOwner ? 'block' : 'none';
    document.getElementById('owner-controls').style.display = isCurrentUserOwner ? 'block' : 'none';
    
    // Si no es el dueño ni está disponible, es un píxel en reventa que otro puede comprar
    const buyResaleButton = document.getElementById('add-to-cart-button');
    if (isOwned && !isCurrentUserOwner) {
        buyResaleButton.textContent = `Comprar por ${pixelElement.dataset.price} USDC`;
        buyResaleButton.style.display = 'block';
        // Conexión del botón de compra individual/reventa
        buyResaleButton.onclick = () => executeResaleOrIndividualBuy(x, y, parseFloat(pixelElement.dataset.price));
    } else if (!isOwned) {
        buyResaleButton.textContent = `Añadir a Cesta (1.00 USDC)`;
    }

    // Mostrar Modal
    MODAL_BACKDROP.style.display = 'flex';
}

// Llama a la blockchain para obtener el estado actual de todos los píxeles (simplificado)
async function refreshMapVisuals() {
    // ESTA FUNCIÓN HARÍA UN BUCLE Y LLAMARÍA getPixelData(x, y) para 100,000 píxeles.
    // Es costoso, para el MVP se puede llamar solo a los píxeles visibles o cargar solo al inicio.
    // Por ahora, solo limpiaremos la selección.
    Object.values(document.getElementsByClassName('pixel')).forEach(p => p.classList.remove('selected'));
    selectedPixels = {};
    updateCartDisplay();
}

// ---------------------------------------------------------
// 7. INICIALIZACIÓN FINAL (Conexión de Eventos)
// ---------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    generateMap(); 
    
    // Conectar botones principales
    document.getElementById('connect-wallet').addEventListener('click', connectWallet);
    CHECKOUT_BUTTON.addEventListener('click', executeBatchPurchase);
    CLOSE_MODAL_BTN.addEventListener('click', () => { MODAL_BACKDROP.style.display = 'none'; });
    
    // Conectar botones de Dueño (modal)
    document.getElementById('change-color-btn').onclick = () => {
        const newColor = document.getElementById('color-picker').value;
        executeChangeColor(currentPixel.x, currentPixel.y, newColor);
    };
    document.getElementById('set-price-btn').onclick = () => {
        const newPrice = parseFloat(document.getElementById('resale-price').value);
        if (isNaN(newPrice) || newPrice <= INITIAL_PRICE_USDC) {
            alert("El precio de reventa debe ser mayor a 1.00 USDC.");
            return;
        }
        executeSetPrice(currentPixel.x, currentPixel.y, newPrice);
    };

    // Conectar botón de 'Añadir a Cesta' en el modal
    document.getElementById('add-to-cart-button').onclick = () => {
        const pixelElement = document.getElementById(`pixel-${currentPixel.x}-${currentPixel.y}`);
        if (pixelElement && pixelElement.dataset.owner === '0x0000000000000000000000000000000000000000') {
            // Lógica para añadir a la cesta (llamando al click handler)
            handlePixelClick({ target: pixelElement });
            MODAL_BACKDROP.style.display = 'none';
        } else {
            // Si el botón se usa para la reventa, llama a la función correspondiente
            executeResaleOrIndividualBuy(currentPixel.x, currentPixel.y, parseFloat(pixelElement.dataset.price));
        }
    };
});
