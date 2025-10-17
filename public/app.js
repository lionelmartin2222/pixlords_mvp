<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pixlords MVP - Mapa Definitivo</title>
    <!-- Carga de Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- FIX CRÍTICO: Carga de la fuente retro "Press Start 2P" -->
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <style>
        /* Estilos base para la dApp */
        body {
            background-color: #1a1a1a;
            color: #ffffff;
            /* FIX: Usar la fuente Press Start 2P */
            font-family: 'Press Start 2P', 'monospace', sans-serif;
            text-align: center;
        }
        
        /* Ajuste para que el texto sea legible con Press Start 2P */
        * {
            font-size: 10px; /* Tamaño base más pequeño para que la fuente pixelada quepa */
        }
        h1 {
            /* FIX: Tamaño grande para el título principal */
            font-size: 32px; 
        }
        .text-xl { font-size: 14px; }
        .text-lg { font-size: 12px; }

        /* Contenedor del mapa (dimensiones visuales) */
        .map-container {
            width: 90%;
            max-width: 1200px; 
            margin: 20px auto;
            /* FIX: Asegurar que el Grid llene el contenedor (500x200) */
            padding: 0; 
            border: 5px solid #39FF14;
            box-shadow: 0 0 20px #39ff144d;
            
            aspect-ratio: 500 / 200; 
            overflow: hidden;
            position: relative;
            background-color: #000;
        }

        /* Estilos del Grid que simula el Canvas/Mapa */
        #pixel-map-container {
            display: grid;
            grid-template-columns: repeat(500, 1fr);
            grid-template-rows: repeat(200, 1fr);
            width: 100%; 
            height: 100%; 
            
            position: absolute;
            top: 0;
            left: 0;
            
            transform-origin: 0 0;
            cursor: grab;
            image-rendering: pixelated;
        }
        
        /* Estilo base para cada píxel (DIV) */
        .pixel {
            width: 100%;
            height: 100%;
            border: none; 
            transition: background-color 0.1s;
        }
        .pixel:hover {
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
        }

        /* Efectos de selección */
        .pixel.selected {
            box-shadow: inset 0 0 0 2px #FFFF00;
        }

        /* Estilos para el modal */
        #modal-backdrop {
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 1000;
        }

        /* Estilos para el log (Se ocultan por defecto) */
        .log-container {
            background-color: #2c2c2c;
            border-top: 1px solid #39FF14;
        }
    </style>
    <script>
        // No necesitamos redefinir tailwind.config.fontFamily si usamos Press Start 2P directamente en CSS
    </script>
</head>
<body class="min-h-screen p-4 flex flex-col items-center">

    <header class="text-center mb-6 w-full max-w-4xl">
        <h1 class="font-extrabold text-[#39FF14] mb-2">PIXLORDS</h1>
        <p class="text-xl text-white">¡Sé el Señor de los Píxeles!</p>
    </header>

    <!-- Estado de Conexión -->
    <div class="mb-4 text-center">
        <button id="connect-wallet" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition duration-150">
            Conectar Billetera (MetaMask)
        </button>
        <p class="text-sm mt-2 font-mono">Estado: <span id="status-message" class="text-yellow-300">Desconectado</span></p>
    </div>

    <!-- Resumen de Cesta y Botones de Compra -->
    <div class="w-full max-w-4xl bg-gray-900 p-4 rounded-xl shadow-lg flex justify-between items-center mb-6 border border-gray-700">
        <span id="cart-summary" class="text-lg font-semibold text-white">
            Cesta: 0 píxeles seleccionados | Total: 0.00 USDC
        </span>
        <div class="space-x-3">
            <button id="pay-batch-btn" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50" disabled>
                Pagar Lote
            </button>
            <button id="clear-cart-btn" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700">
                Limpiar Cesta
            </button>
        </div>
    </div>

    <!-- Contenedor del Mapa (DIVs/Grid) -->
    <div id="map-wrap" class="map-container">
        <!-- El JS inyectará los 100,000 DIVs aquí -->
        <div id="pixel-map-container"></div> 
    </div>

    <!-- FIX: Ocultar Log y Footer para el usuario final -->
    <div id="debug-section" class="hidden">
        <!-- Log de Transacciones/Errores (simulación) -->
        <div class="mt-6 p-4 w-full max-w-4xl log-container rounded-xl shadow-lg">
            <h2 class="text-xl font-bold mb-2 border-b border-gray-700 pb-1 text-[#39FF14]">Log de la dApp (Simulación)</h2>
            <div id="dAppLog" class="text-sm font-mono max-h-32 overflow-y-auto text-gray-400">
                > Sistema listo. Esperando inicialización del mapa...
            </div>
        </div>

        <footer class="mt-8 text-sm text-gray-500">
            Arquitectura Final: dApp en Polygon/USDC. Backend: Muhammad.
        </footer>
    </div>


    <!-- Modal de Información y Acciones del Pixel -->
    <div id="modal-backdrop" class="fixed inset-0 hidden items-center justify-center transition-opacity" onclick="if(event.target.id === 'modal-backdrop') hideModal()">
        <div class="bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-md border border-indigo-500">
            <h3 class="text-2xl font-bold mb-4 text-indigo-400">Detalles del Pixel</h3>
            
            <p class="text-sm font-mono mb-2">Coordenadas: <span id="modal-coords"></span></p>
            <p class="text-sm mb-2">Precio de Venta: <span id="modal-price" class="font-bold text-yellow-300"></span></p>
            <p class="text-sm mb-4">Dueño Actual: <span id="modal-owner" class="font-mono text-xs text-green-400"></span></p>

            <!-- Controles de Propiedad -->
            <div id="owner-controls" class="border-t border-gray-700 pt-4 mt-4 hidden">
                <h4 class="font-semibold mb-2 text-indigo-400">Controles (Tú eres el dueño)</h4>
                
                <div class="mb-3">
                    <label for="new-price" class="block text-sm mb-1">Fijar Nuevo Precio (USDC):</label>
                    <input type="number" id="new-price" value="1.00" step="0.01" class="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white">
                    <button id="sell-pixel-btn" class="mt-2 w-full bg-red-600 py-2 rounded-lg hover:bg-red-700">Poner en Venta</button>
                </div>

                <div class="mb-3">
                    <label for="new-color" class="block text-sm mb-1">Cambiar Color (Simulación):</label>
                    <input type="color" id="new-color" value="#008000" class="w-full h-10 p-1 rounded bg-gray-700 border border-gray-600">
                    <button id="set-color-btn" class="mt-2 w-full bg-blue-600 py-2 rounded-lg hover:bg-blue-700">Cambiar Color</button>
                </div>
            </div>

            <!-- Botón de Acción Principal -->
            <button id="buy-pixel-btn" class="mt-4 w-full py-3 rounded-lg font-bold bg-green-500 hover:bg-green-600">
                AÑADIR A CESTA
            </button>

            <button id="close-modal-btn" class="mt-3 w-full py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-sm">
                Cerrar
            </button>
        </div>
    </div>


    <!-- Lógica Principal del Mapa y la Interfaz -->
    <script>
        // =========================================================
        // PARTE I: CONFIGURACIÓN Y SIMULACIÓN GEOGRÁFICA
        // =========================================================

        const WIDTH = 500; 
        const HEIGHT = 200; 
        const MAP_CONTAINER_ID = 'pixel-map-container';
        const INITIAL_PRICE_USDC = 1.00; 
        
        const LAND_COLOR = '#047857'; // Tierra (Verde oscuro/Esmeralda)
        const SEA_COLOR = '#1d4ed8'; // Agua (Azul oscuro/Cobalto)
        const RECLAMABLE_COLOR = '#78716c'; // Neutral/Comprable (Gris piedra)
        
        let mapData = []; // Almacena los objetos {x, y, color, owner, isOwned}
        let selectedPixels = new Set(); 
        
        // Estado de Zoom/Panorámica para el contenedor del Grid
        let scale = 1.5; // Escala inicial ampliada (para que se vea más grande)
        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;
        let lastX, lastY;
        let dragStartX = 0; 
        let dragStartY = 0;
        let mapContainer;

        // Función de generación de mapa orgánico MEJORADA (Tierra Mayoritaria, Suavizado, Islas Variadas)
        function getInitialMapColor(x, y) {
            const centerX = WIDTH * 0.5;
            const centerY = HEIGHT * 0.5;
            
            // 1. Distancia elíptica normalizada (Para forma general)
            const distNorm = Math.sqrt(
                Math.pow((x - centerX) / (WIDTH * 0.55), 2) + 
                Math.pow((y - centerY) / (HEIGHT * 0.55), 2) 
            );

            // 2. Ruido para bordes irregulares (combinación de funciones trigonométricas)
            const noise = (
                Math.sin(x * 0.05) * 0.15 + 
                Math.cos(y * 0.03) * 0.1 +
                Math.sin((x + y) * 0.02) * 0.1 // Ruido diagonal
            );
            
            // Umbral de masa terrestre: Aumentado a 0.85 para tierra SÚPER MAYORITARIA
            const landThreshold = 0.85; 

            let isLand = distNorm < (landThreshold + noise * 0.6); 
            
            // Simulación de ríos y lagos internos (serpenteantes e irregulares)
            if (isLand) {
                // Patrón de río serpenteante más orgánico
                const riverPath = centerY + Math.sin(x * 0.02) * (HEIGHT * 0.1) + Math.cos(y * 0.04) * 8;
                const riverWidth = 4; 
                
                // Río
                if (Math.abs(y - riverPath) < riverWidth) {
                    if (y > 20 && y < HEIGHT - 20) {
                        return SEA_COLOR; 
                    }
                }
                
                // Simulación de lago irregular
                const lakeCenterX = centerX * 0.4; 
                const lakeCenterY = centerY * 0.7; 
                const lakeDist = Math.sqrt(
                    Math.pow((x - lakeCenterX) / 1.5, 2) + 
                    Math.pow((y - lakeCenterY) / 1.2, 2)
                );
                const lakeRadiusNoise = 50 + Math.cos(x * 0.1) * 15 + Math.sin(y * 0.08) * 10; 
                
                if (lakeDist < lakeRadiusNoise) {
                    return SEA_COLOR; // Píxel de lago (agua)
                }

                
                // 15% de los píxeles terrestres restantes son comprables ('0')
                if (Math.random() < 0.15) {
                    return RECLAMABLE_COLOR; // Píxel '0'
                }
                
                // El resto es tierra base
                return LAND_COLOR; 
            }

            // 4. Simulación de archipiélagos (Islas en el mar) - Variedad de tamaños
            
            // Usamos una función de ruido Perlin simulada para agrupar píxeles y formar islas más grandes
            // Si el píxel vecino ya es tierra, aumentar la probabilidad de que este también lo sea.
            const baseIslandChance = 0.01;
            let islandChance = baseIslandChance;

            if (x > 0 && mapData[y][x-1].color !== SEA_COLOR) {
                islandChance += 0.05;
            }
            if (y > 0 && mapData[y-1][x].color !== SEA_COLOR) {
                islandChance += 0.05;
            }
            
            if (Math.random() < islandChance) {
                // Si formamos una isla, hay mayor chance de que sea comprable.
                return Math.random() < 0.7 ? RECLAMABLE_COLOR : LAND_COLOR;
            }

            return SEA_COLOR;
        }

        // Inicializa los datos (Hard Reset: Todos Libres)
        function initializeMapData() {
            // FIX: Inicializar mapData por fila para permitir la verificación de vecinos para islas (getInitialMapColor)
            for (let y = 0; y < HEIGHT; y++) {
                mapData[y] = [];
                for (let x = 0; x < WIDTH; x++) {
                    const color = getInitialMapColor(x, y);
                    
                    // LÓGICA DE PROPIEDAD DE LANZAMIENTO: TODOS LIBRES
                    const isOwned = false; 
                    const owner = 'Nadie'; 
                    const price = INITIAL_PRICE_USDC; 

                    mapData[y][x] = {
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

        // Función clave que sustituye a drawMap() del Canvas 2D
        function renderMap() {
            mapContainer = document.getElementById(MAP_CONTAINER_ID); 
            
            if (!mapContainer) {
                // Este log solo es visible si se remueve el 'hidden' de debug-section
                logToDApp("ERROR CRÍTICO: El contenedor del mapa DIV no fue encontrado.", true);
                return;
            }
            mapContainer.innerHTML = ''; 

            // Aplicar escala inicial (Zoom inicial) y transformaciones de posición
            mapContainer.style.transform = `scale(${scale})`;
            mapContainer.style.left = `calc(50% + ${offsetX}px)`;
            mapContainer.style.top = `calc(50% + ${offsetY}px)`;
            mapContainer.style.marginLeft = `-${WIDTH / 2}px`; 
            mapContainer.style.marginTop = `-${HEIGHT / 2}px`; 


            // Inyectar los 100,000 DIVs
            mapData.forEach(row => {
                row.forEach(pixel => {
                    const pixelElement = document.createElement('div');
                    pixelElement.className = 'pixel';
                    pixelElement.style.backgroundColor = pixel.color;
                    
                    if (pixel.isOwned) {
                        pixelElement.setAttribute('data-owner-status', 'owned');
                    }

                    pixelElement.dataset.x = pixel.x;
                    pixelElement.dataset.y = pixel.y;

                    
                    mapContainer.appendChild(pixelElement);
                });
            });
            // Este log solo es visible si se remueve el 'hidden' de debug-section
            logToDApp("Mapa renderizado con " + (WIDTH * HEIGHT) + " píxeles usando DIVs/Grid.", false);
        }

        function handlePixelSelection(pixel, pixelElement) {
            const id = `${pixel.x},${pixel.y}`;
            
            // Permitir seleccionar RECLAMABLE_COLOR (que es '0')
            if (pixel.color === LAND_COLOR || pixel.color === SEA_COLOR) {
                // Este log solo es visible si se remueve el 'hidden' de debug-section
                logToDApp("No puedes seleccionar tierra base o agua.", true);
                return;
            }

            if (pixel.isOwned) {
                // Click en píxel de reventa (simulación)
                showModal(pixel, pixelElement);
                return;
            }

            // Lógica de selección para lote
            if (selectedPixels.has(id)) {
                selectedPixels.delete(id);
                pixelElement.classList.remove('selected');
            } else {
                selectedPixels.add(id);
                pixelElement.classList.add('selected');
            }
            updateCartSummary();
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

        // --- Lógica de Panorámica y Zoom para DIV/Grid (CSS Transform) ---

        function updateTransform() {
            // Aplicar el zoom/pan al contenedor del mapa
            mapContainer.style.transform = `scale(${scale})`;
            // Los offsets mueven el mapa DENTRO del contenedor
            mapContainer.style.left = `calc(50% + ${offsetX}px)`; 
            mapContainer.style.top = `calc(50% + ${offsetY}px)`;
        }

        function startDrag(event) {
            // Solo iniciar el arrastre si es el botón principal (clic izquierdo)
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

                // Si no fue un arrastre significativo, manejarlo como clic
                if (dx < CLICK_THRESHOLD && dy < CLICK_THRESHOLD) {
                    const pixelElement = event.target.closest('.pixel');
                    if (pixelElement) {
                        const x = parseInt(pixelElement.dataset.x);
                        const y = parseInt(pixelElement.dataset.y);
                        const pixel = mapData[y][x];
                        handlePixelSelection(pixel, pixelElement);
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

            // Se debe mover los offsets en píxeles de pantalla, no del mapa
            offsetX += dx / scale;
            offsetY += dy / scale;

            lastX = clientX;
            lastY = clientY;

            updateTransform();
        }

        function zoom(event) {
            event.preventDefault(); 
            const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
            const oldScale = scale;

            scale *= zoomFactor;
            scale = Math.max(0.5, Math.min(5.0, scale)); // Límite de Zoom aumentado

            // El zoom se centra en el punto medio de la pantalla
            
            updateTransform();
        }

        // --- Funciones de Modal y Auxiliares ---

        function showModal(pixel, element) {
            document.getElementById('modal-coords').textContent = `(X:${pixel.x}, Y:${pixel.y})`;
            document.getElementById('modal-price').textContent = `${pixel.price.toFixed(2)} USDC`;
            document.getElementById('modal-owner').textContent = pixel.owner;
            
            
            const isUserOwner = (pixel.owner === '0xAbcD...1234'); 

            document.getElementById('owner-controls').classList.toggle('hidden', !isUserOwner);
            const buyBtn = document.getElementById('buy-pixel-btn');

            if (!pixel.isOwned) {
                buyBtn.textContent = 'AÑADIR A CESTA (Lote)';
                buyBtn.onclick = () => {
                    handlePixelSelection(pixel, element);
                    hideModal();
                };
            } else {
                buyBtn.textContent = `COMPRAR (Reventa) por ${pixel.price.toFixed(2)} USDC`;
                buyBtn.onclick = () => {
                    // Este log solo es visible si se remueve el 'hidden' de debug-section
                    logToDApp(`Simulación: Compra Individual/Reventa de (${pixel.x}, ${pixel.y}) por ${pixel.price.toFixed(2)} USDC.`, false);
                    hideModal();
                };
            }

            document.getElementById('modal-backdrop').classList.remove('hidden');
            document.getElementById('modal-backdrop').style.display = 'flex';
        }

        function hideModal() {
            document.getElementById('modal-backdrop').classList.add('hidden');
        }

        // --- Funciones de Log y Conexión (Mantenidas) ---

        function logToDApp(message, isError = false) {
            const logElement = document.getElementById('dAppLog');
            if (!logElement) return; // Si el log está oculto, salir.

            const color = isError ? 'text-red-400' : 'text-green-400';
            logElement.innerHTML = `<p class="${color}">> ${new Date().toLocaleTimeString()} | ${message}</p>` + logElement.innerHTML;
            while (logElement.children.length > 10) {
                logElement.removeChild(logElement.lastChild);
            }
        }
        
        // Simulación de conexión y compra
        let currentAccount = null; 

        function connectWallet() {
            const statusMessage = document.getElementById('status-message');
            const connectBtn = document.getElementById('connect-wallet');
            
            setTimeout(() => {
                currentAccount = '0xAbCdEfGhIjKlMnOpQrStUvWxYz0123456789aB'.toLowerCase();
                statusMessage.textContent = `Conectado: ${currentAccount.substring(0, 6)}...`;
                connectBtn.textContent = 'Desconectar';
                statusMessage.style.color = '#39FF14'; 
                connectBtn.onclick = disconnectWallet;
                logToDApp("Simulación de conexión exitosa a MetaMask.", false);
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
            logToDApp("Billetera desconectada.", false);
        }

        function executeBatchPurchase() {
            if (selectedPixels.size > 0) {
                logToDApp(`Simulación de COMPRA POR LOTE de ${selectedPixels.size} píxeles. ¡Llamando al Smart Contract!`, false);
                // Aquí se integraría la llamada real a buyMultiplePixels
                
                // Simulación: Cambiar propiedad de los píxeles seleccionados
                selectedPixels.forEach(id => {
                    const [x, y] = id.split(',').map(Number);
                    const pixel = mapData[y][x];
                    pixel.isOwned = true;
                    pixel.owner = currentAccount || '0xSimulacion';
                    pixel.color = '#f59e0b'; // Color de un nuevo dueño (Player A)
                    
                    const element = document.querySelector(`.pixel[data-x="${x}"][data-y="${y}"]`);
                    if (element) {
                         element.style.backgroundColor = pixel.color;
                         element.classList.remove('selected');
                         element.setAttribute('data-owner-status', 'owned');
                    }
                });
                clearCart();
                logToDApp("Transacción de lote simulada y píxeles actualizados.", false);

            }
        }

        // --- INICIALIZACIÓN FINAL ---

        document.addEventListener('DOMContentLoaded', () => {
            initializeMapData();
            renderMap();
            
            // Adjuntar eventos de drag/zoom al contenedor principal
            mapContainer = document.getElementById(MAP_CONTAINER_ID);
            mapContainer.addEventListener('mousedown', startDrag);
            mapContainer.addEventListener('mouseup', endDrag);
            mapContainer.addEventListener('mousemove', drag);
            mapContainer.addEventListener('mouseleave', endDrag);
            mapContainer.addEventListener('wheel', zoom);
            
            // Eventos de botones
            document.getElementById('connect-wallet').addEventListener('click', connectWallet);
            document.getElementById('pay-batch-btn').addEventListener('click', executeBatchPurchase);
            document.getElementById('clear-cart-btn').addEventListener('click', clearCart);
            document.getElementById('close-modal-btn').addEventListener('click', hideModal);
            
            // Simulación de controles de dueño
            document.getElementById('set-color-btn').addEventListener('click', () => {
                const newColor = document.getElementById('new-color').value;
                logToDApp(`Simulación: Cambiando color a ${newColor}.`, false);
                hideModal();
            });
            
            document.getElementById('sell-pixel-btn').addEventListener('click', () => {
                const newPrice = document.getElementById('new-price').value;
                logToDApp(`Simulación: Poniendo píxel en venta por ${newPrice} USDC.`, false);
                hideModal();
            });
        });
    </script>
</body>
</html>
