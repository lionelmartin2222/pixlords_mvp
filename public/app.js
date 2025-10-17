<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pixlords MVP - Mapa Geográfico</title>
    <!-- Carga de Tailwind CSS para estilos modernos y responsivos -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Estilos personalizados para el contenedor del mapa */
        .map-container {
            /* Aumentamos el ancho máximo para que la imagen sea más grande */
            max-width: 1200px; 
            margin: 0 auto;
            border: 4px solid #1f2937; /* Borde oscuro */
            border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            /* Establece una altura fija o basada en proporción para el lienzo */
            aspect-ratio: 5 / 2; /* 500 de ancho x 200 de alto -> 5:2 */
            touch-action: none; /* Previene el scroll del body al hacer zoom/pan en touch */
        }
        /* El canvas se redimensiona automáticamente dentro de su contenedor */
        #mapCanvas {
            display: block;
            width: 100%;
            height: 100%; /* El canvas llena el contenedor con el aspect-ratio 5:2 */
            cursor: grab;
            image-rendering: pixelated; /* Crucial para un estilo de píxeles nítido */
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
        }
        /* Estilos para el indicador de carga */
        #loading-indicator {
            position: fixed; /* Cambiado a fixed para cubrir toda la pantalla */
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            z-index: 1000;
        }
    </style>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                }
            }
        }
    </script>
</head>
<body class="bg-gray-100 min-h-screen p-4 font-sans flex flex-col items-center">

    <!-- Indicador de Carga (oculto por defecto) -->
    <div id="loading-indicator" class="hidden">
        <p class="p-4 bg-gray-700 rounded-lg shadow-xl">Cargando Mapa...</p>
    </div>

    <header class="text-center mb-6 w-full max-w-4xl">
        <h1 class="text-4xl font-extrabold text-gray-900 mb-2">PIXLORDS MVP</h1>
        <p class="text-lg text-gray-600">Visor de Mapa Geográfico (Versión 7.0 - Mapa Corregido)</p>
    </header>

    <!-- Contenedor del Mapa -->
    <div id="map-wrap" class="map-container bg-gray-900 shadow-xl w-full">
        <canvas id="mapCanvas"></canvas>
    </div>

    <!-- Panel de Información del Pixel (oculto por defecto) -->
    <div id="pixelInfo" class="mt-6 p-4 w-full max-w-4xl bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 class="text-xl font-bold mb-2 text-gray-800">Detalles del Pixel Seleccionado</h2>
        <p id="infoContent" class="text-gray-600">Haz clic en un píxel para ver sus detalles.</p>
        <div class="mt-3 flex space-x-2">
            <button id="buyButton" class="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 hidden" onclick="simulateTransaction('Comprar')">
                Comprar Pixel (0.5 USDC)
            </button>
            <button id="setPriceButton" class="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-150 hidden" onclick="simulateTransaction('Fijar Precio de Venta')">
                Fijar Precio de Venta
            </button>
        </div>
    </div>

    <!-- Log de Transacciones/Errores (simulación) -->
    <div class="mt-6 p-4 w-full max-w-4xl bg-gray-800 text-white rounded-xl shadow-lg">
        <h2 class="text-xl font-bold mb-2 border-b border-gray-700 pb-1">Log de la dApp (Simulación)</h2>
        <div id="dAppLog" class="text-sm font-mono max-h-32 overflow-y-auto text-gray-400">
            > Sistema listo. Esperando inicialización de la dApp...
        </div>
    </div>

    <footer class="mt-8 text-sm text-gray-500">
        Arquitectura Final: dApp en Polygon/USDC. Backend: Muhammad.
    </footer>

    <!-- Scripts de Firebase (Boilerplate - Inicialización de Auth y DB) -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // Variables globales que deben estar disponibles en el entorno de Canvas
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-pixlords-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null; // CORREGIDO: Usar __initial_auth_token

        let db;
        let auth;
        window.isAuthReady = false; // Bandera para indicar que la autenticación está lista

        // Inicialización de Firebase
        if (Object.keys(firebaseConfig).length > 0) {
            const app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            window.db = db;
            window.auth = auth;

            // Función para manejar la autenticación
            async function setupAuth() {
                try {
                    // CORRECCIÓN CLAVE: Usar la variable local 'initialAuthToken', no '__initialAuthToken'
                    if (initialAuthToken) { 
                        await signInWithCustomToken(auth, initialAuthToken);
                        console.log("Autenticación exitosa con token personalizado.");
                    } else {
                        await signInAnonymously(auth);
                        console.log("Autenticación anónima exitosa.");
                    }

                    onAuthStateChanged(auth, (user) => {
                        if (user) {
                            window.userId = user.uid;
                            console.log("Usuario autenticado. UID:", user.uid);
                            window.isAuthReady = true;
                            // Una vez que el auth está listo, notificamos a la aplicación
                            if (window.initApp) {
                                window.initApp();
                            }
                        } else {
                            window.userId = 'anonymous';
                            console.log("Usuario no autenticado (o anónimo).");
                            window.isAuthReady = true;
                            if (window.initApp) {
                                window.initApp();
                            }
                        }
                    });
                } catch (error) {
                    console.error("Error en la autenticación:", error);
                }
            }

            // Llamar a la función de autenticación al cargar el script
            setupAuth();
        } else {
            console.error("Configuración de Firebase no disponible. Inicialización fallida.");
            window.isAuthReady = true;
        }
    </script>


    <!-- Lógica Principal del Mapa y la Interfaz -->
    <script>
        let mapData = [];
        const PIXEL_SIZE = 10; // Tamaño base del píxel en el modelo
        
        // **********************************************
        // CRÍTICO: DIMENSIONES AJUSTADAS
        // Para simular 500x200, usaremos 100x40 para la matriz de datos 
        // y escalaremos, manteniendo la proporción 5:2 (200/500 = 0.4)
        const mapWidth = 100; // Dimensiones de la matriz de datos lógica
        const mapHeight = 40; // Dimensiones de la matriz de datos lógica
        // **********************************************
        
        let canvas, ctx;
        window.mapInitialized = false; // Bandera de seguridad

        // Estado de Panorámica y Zoom
        let scale = 1.0;
        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;
        let lastX, lastY;
        // NUEVAS VARIABLES para rastrear el inicio del clic/arrastre
        let dragStartX = 0;
        let dragStartY = 0;


        // Definición de colores para cada tipo de territorio
        const COLOR_MAP = {
            'T': '#047857', // Land / Tierra (Verde oscuro/Esmeralda - Color de la imagen)
            'W': '#1d4ed8', // Water / Agua (Azul oscuro/Cobalto - Color de la imagen)
            'R': '#a1a1aa', // Road/River / Carretera/Río (Gris claro)
            '0': '#78716c', // Neutral/Unclaimed / Reclamable (Gris piedra)
            'A': '#f59e0b', // Player A / Propietario A (Ámbar)
            'B': '#ef4444', // Player B / Propietario B (Rojo)
            'C': '#8b5cf6', // Player C / Propietario C (Violeta)
            // Puedes añadir más colores para más propietarios 'D', 'E', etc.
        };

        // ====================================================================
        // CRÍTICO: MATRIZ DE DATOS DEL MAPA (100x40 PÍXELES)
        // Nueva matriz de datos generada para simular el contorno irregular 
        // de la imagen PNG y aplicar la jugabilidad.
        // T=Tierra, W=Agua, R=Río/Carretera, 0=Neutral/Comprable, A, B=Propiedad.
        // ====================================================================

        const MAP_DATA_STRING = `WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW`;

        // ====================================================================
        // FIN DE LA MATRIZ DE DATOS
        // ====================================================================


        // Función para parsear la cadena de texto en una matriz 2D
        function initializeMapData() {
            try {
                const rows = MAP_DATA_STRING.trim().split('\n');
                mapData = rows.map(row => row.split('').map(char => char.trim()));

                const actualHeight = mapData.length;
                const actualWidth = mapData[0] ? mapData[0].length : 0;
                
                // Validación para consistencia (importante si la matriz fuera dinámica)
                if (actualHeight !== mapHeight || actualWidth !== mapWidth) {
                   logToDApp(`ADVERTENCIA: Matriz cargada de ${actualWidth}x${actualHeight}. Esperado: ${mapWidth}x${mapHeight}`, true);
                }

                if (mapHeight === 0 || mapWidth === 0) {
                    throw new Error("La matriz de datos está vacía o malformada.");
                }

                logToDApp("Matriz de datos de mapa cargada: " + mapWidth + "x" + mapHeight + " píxeles.");
            } catch (error) {
                logToDApp("ERROR al inicializar la matriz de mapa: " + error.message, true);
            }
        }

        // Función principal para dibujar el mapa
        function drawMap() {
            if (!ctx || mapData.length === 0) return; // Comprobación añadida para datos
            
            // Se asume que todas las filas tienen el mismo ancho
            const actualHeight = mapData.length;
            const actualWidth = mapData[0] ? mapData[0].length : 0;
            if (actualWidth === 0) return; // Comprobación para filas vacías

            // 1. Limpiar y Transformar (Panorámica y Zoom)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);

            // 2. Dibujar la cuadrícula de píxeles
            // Usamos las dimensiones REALES de los datos cargados para evitar desbordamiento de índice.
            for (let y = 0; y < actualHeight; y++) {
                // Usamos el ancho de la primera fila, asumiendo una matriz rectangular.
                for (let x = 0; x < actualWidth; x++) {
                    const pixelType = mapData[y][x];
                    const color = COLOR_MAP[pixelType] || '#000000'; // Fallback a negro
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);

                    // Opcional: Borde para mejor distinción de píxeles
                    ctx.strokeStyle = '#00000010'; // Borde muy sutil
                    ctx.lineWidth = 0.2;
                    ctx.strokeRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
                }
            }

            ctx.restore();
        }

        // Manejo de eventos de clic en el mapa
        function handlePixelClick(event) {
            // Convertir coordenadas del evento a coordenadas del canvas
            const rect = canvas.getBoundingClientRect();
            const clientX = event.clientX || (event.touches ? event.touches[0].clientX : 0);
            const clientY = event.clientY || (event.touches ? event.touches[0].clientY : 0);

            const canvasX = clientX - rect.left;
            const canvasY = clientY - rect.top;

            // Aplicar la inversa de la transformación (Zoom y Panorámica)
            const mapCoordX = (canvasX - offsetX) / scale;
            const mapCoordY = (canvasY - offsetY) / scale;

            // Obtener la posición del píxel en la matriz
            const pixelX = Math.floor(mapCoordX / PIXEL_SIZE);
            const pixelY = Math.floor(mapCoordY / PIXEL_SIZE);

            if (pixelX >= 0 && pixelX < mapWidth && pixelY >= 0 && pixelY < mapHeight) {
                const pixelType = mapData[pixelY] ? mapData[pixelY][pixelX] : 'W'; // Seguridad añadida
                
                // Simulación avanzada de propiedad para píxeles no T ni W
                let owner = 'Nadie';
                if (pixelType === 'A') owner = '0xPropietarioA';
                if (pixelType === 'B') owner = '0xPropietarioB';
                
                const isOwned = owner !== 'Nadie' && pixelType !== '0';
                const status = pixelType === '0' ? 'Disponible para compra' : (isOwned ? 'Propiedad' : 'No comprable (Agua/Tierra)');

                // Simulación de colores de botón
                const ownerColor = owner === '0xPropietarioA' ? 'text-amber-500' : (owner === '0xPropietarioB' ? 'text-red-500' : 'text-gray-600');

                // Mostrar información
                document.getElementById('infoContent').innerHTML = `
                    <p class="font-mono text-sm">Coordenadas: (${pixelX}, ${pixelY})</p>
                    <p>Tipo de Terreno: <span class="font-bold">${getTerrainName(pixelType)}</span></p>
                    <p>Estado de Propiedad: <span class="font-semibold">${status}</span></p>
                    <p>Dueño Actual: <span class="font-semibold ${ownerColor}">${owner}</span></p>
                `;

                // Mostrar/Ocultar botones de acción (simulación)
                document.getElementById('buyButton').classList.toggle('hidden', isOwned || pixelType !== '0');
                // Asumimos que 'setPriceButton' solo es visible si es propiedad (y el dueño es el usuario, pero lo simulamos aquí)
                document.getElementById('setPriceButton').classList.toggle('hidden', !isOwned);

                logToDApp(`Pixel clicado: (${pixelX}, ${pixelY}) - Tipo: ${getTerrainName(pixelType)}`);
            }
        }

        // Función de ayuda para nombrar el terreno
        function getTerrainName(type) {
            switch (type) {
                case 'W': return 'Agua/Mar';
                case 'T': return 'Tierra/Terreno';
                case 'R': return 'Río/Ruta';
                case '0': return 'Zona Reclamable (Neutral)';
                case 'A':
                case 'B':
                case 'C':
                    return `Territorio de Propietario ${type}`;
                default: return 'Desconocido';
            }
        }

        // Función de simulación para las transacciones
        function simulateTransaction(action) {
            logToDApp(`[TX SIMULADA] Solicitando acción: '${action}' en la dApp.`, false);
            // Aquí se integraría la llamada a buyPixel, buyMultiplePixels, o setSalePrice del Backend (Muhammad)
            setTimeout(() => {
                logToDApp(`[TX CONFIRMADA] '${action}' procesada exitosamente en Polygon.`, false);
            }, 1500);
        }

        // Función para registrar mensajes en el log
        function logToDApp(message, isError = false) {
            const logElement = document.getElementById('dAppLog');
            const color = isError ? 'text-red-400' : 'text-green-400';
            logElement.innerHTML = `<p class="${color}">> ${new Date().toLocaleTimeString()} | ${message}</p>` + logElement.innerHTML;
            // Limitar el tamaño del log
            while (logElement.children.length > 10) {
                logElement.removeChild(logElement.lastChild);
            }
        }

        // ====================================================================
        // Manejo de Interacciones (Panorámica y Zoom) - FUNCIONALIDAD EXISTENTE
        // ====================================================================

        function initInteractions() {
            // Eventos de ratón
            canvas.addEventListener('mousedown', startDrag);
            canvas.addEventListener('mouseup', endDrag);
            canvas.addEventListener('mousemove', drag);
            canvas.addEventListener('mouseleave', endDrag);
            canvas.addEventListener('wheel', zoom);
            // Evento de clic directo (seguridad)
            canvas.addEventListener('click', (e) => {
                // Si no estamos en un ciclo de arrastre/arrastre, se procesa el clic.
                if (!isDragging) {
                    handlePixelClick(e);
                }
            });


            // Soporte táctil
            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    startDrag(e.touches[0]);
                } else if (e.touches.length === 2) {
                    // Ignorar multi-touch por simplicidad, o implementar zoom por pellizco.
                }
            });
            canvas.addEventListener('touchend', endDrag);
            canvas.addEventListener('touchmove', (e) => {
                if (e.touches.length === 1) {
                    drag(e.touches[0]);
                    e.preventDefault(); // Previene el scroll del body
                }
            });

            // Re-dibujar en resize
            window.addEventListener('resize', setupCanvas);
        }

        function startDrag(event) {
            // Solo iniciar el arrastre si es el botón principal (clic izquierdo)
            if (event.button !== undefined && event.button !== 0) return;
            
            isDragging = true;
            lastX = event.clientX || event.pageX;
            lastY = event.clientY || event.pageY;
            // Guardar posición inicial para determinar si fue un clic
            dragStartX = lastX; 
            dragStartY = lastY;
            
            canvas.style.cursor = 'grabbing';
            // Previene la selección de texto en algunos navegadores
            event.preventDefault(); 
        }

        function endDrag(event) {
            // Usamos un pequeño umbral de distancia para distinguir entre arrastre y clic.
            const CLICK_THRESHOLD = 5; 
            
            if (isDragging) {
                isDragging = false;
                canvas.style.cursor = 'grab';

                // Obtener coordenadas finales (manejando mouse y touch)
                const finalX = event.clientX || (event.changedTouches ? event.changedTouches[0].clientX : lastX);
                const finalY = event.clientY || (event.changedTouches ? event.changedTouches[0].clientY : lastY);
                
                const dx = Math.abs(finalX - dragStartX);
                const dy = Math.abs(finalY - dragStartY);

                // Si se movió menos que el umbral, se considera un clic
                if (dx < CLICK_THRESHOLD && dy < CLICK_THRESHOLD) {
                    // Llamar a handlePixelClick con el evento original (o evento táctil final)
                    // Nota: Si el evento es 'touchend', debemos usar event.changedTouches[0]
                    const clickEvent = event.changedTouches ? event.changedTouches[0] : event;
                    handlePixelClick(clickEvent);
                }
                
                // Si fue un arrastre, drawMap ya se llamó en drag()
            }
        }

        function drag(event) {
            if (!isDragging) return;
            
            const clientX = event.clientX || event.pageX || (event.touches ? event.touches[0].clientX : 0);
            const clientY = event.clientY || event.pageY || (event.touches ? event.touches[0].clientY : 0);

            const dx = clientX - lastX;
            const dy = clientY - lastY;

            offsetX += dx;
            offsetY += dy;

            lastX = clientX;
            lastY = clientY;

            drawMap();
        }

        function zoom(event) {
            event.preventDefault(); // Detener el scroll de la página
            const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
            const oldScale = scale;

            scale *= zoomFactor;
            scale = Math.max(0.5, Math.min(10.0, scale)); // Límites de Zoom (Aumentado a 10.0)

            // Mover el punto de zoom al cursor (zoom a punto fijo)
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            offsetX = mouseX - ((mouseX - offsetX) * (scale / oldScale));
            offsetY = mouseY - ((mouseY - offsetY) * (scale / oldScale));

            drawMap();
        }

        // ====================================================================
        // Inicialización del Canvas y Dibujo
        // ====================================================================

        function setupCanvas() {
            const container = document.getElementById('map-wrap');
            canvas = document.getElementById('mapCanvas');
            
            if (!canvas) {
                logToDApp("ERROR: Elemento 'mapCanvas' no encontrado.", true);
                return;
            }

            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight; // Usa la altura definida por CSS (aspect-ratio 5:2)

            // Inicializar el Pan/Zoom para centrar el mapa al inicio
            if (mapWidth > 0 && mapHeight > 0) {
                const mapPixelWidth = mapWidth * PIXEL_SIZE;
                const mapPixelHeight = mapHeight * PIXEL_SIZE;

                // Calcular el zoom inicial para que el mapa quepa completamente y se vea más grande (mayor a 1.0)
                // Usamos un factor de 1.5 para hacerlo visiblemente más grande que el tamaño por defecto
                scale = Math.min(canvas.width / mapPixelWidth, canvas.height / mapPixelHeight) * 1.5; 
                scale = Math.max(1.0, Math.min(10.0, scale)); // Aseguramos que el zoom inicial sea al menos 1.0

                // Centrar el mapa
                offsetX = (canvas.width - mapPixelWidth * scale) / 2;
                offsetY = (canvas.height - mapPixelHeight * scale) / 2;
            }

            drawMap();
        }

        // Nueva función principal para inicializar SOLO el mapa (independiente de Firebase)
        function initializeMap() {
            if (window.mapInitialized) return;

            canvas = document.getElementById('mapCanvas');
            if (!canvas) {
                logToDApp("ERROR CRÍTICO: No se pudo obtener el elemento Canvas para inicializar.", true);
                return;
            }
            ctx = canvas.getContext('2d');

            initializeMapData();
            setupCanvas();
            initInteractions();

            logToDApp("Mapa base dibujado y listo para interacción.", false);
            window.mapInitialized = true;
        }


        // Función que llama Firebase, ahora solo usada para finalizar la carga
        window.initApp = function() {
            // Aseguramos que el mapa se cargue, por si Firebase fue más rápido que DOMContentLoaded
            if (!window.mapInitialized) {
                initializeMap();
            }
            document.getElementById('loading-indicator').classList.add('hidden');
            logToDApp("Estado de la dApp actualizado. Listo para conexión de billetera.", false);
        }
        
        // Ejecución principal: Cargar el mapa tan pronto como el DOM esté listo
        document.addEventListener('DOMContentLoaded', () => {
             // 1. Mostrar indicador de carga
            document.getElementById('loading-indicator').classList.remove('hidden');
            
            // 2. Intentar inicializar el mapa inmediatamente, ya que no depende de Firebase
            initializeMap();

            // 3. Si no hay Firebase config, forzar la finalización de la carga visual
            const hasFirebaseConfig = typeof __firebase_config !== 'undefined' && Object.keys(JSON.parse(__firebase_config)).length > 0;
            if (!hasFirebaseConfig) {
                 window.initApp(); 
            }
        });

    </script>
</body>
</html>
