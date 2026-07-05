# E-Commerce Technology Detector & Auditor Engine

Un motor avanzado y dashboard de auditoría en tiempo real para identificar la infraestructura tecnológica, pasarelas de pago, aplicaciones de e-commerce y el rendimiento (Lighthouse) de cualquier sitio web comercial.

Desarrollado bajo los lineamientos estéticos del sistema de diseño **Sleek** (estética oscura de alto contraste, tipografía Inter y cuadrícula estricta de 8px) y optimizado con controles avanzados de seguridad CORS/CSP y carga asíncrona de datos.

---

## Características Principales

*   **Identificación de CMS y E-Commerce:** Detección de confianza ponderada de Shopify (con Dawn/Dawn-schema themes), Magento, WooCommerce, PrestaShop y VTEX mediante scraping adaptativo del DOM.
*   **Auditoría de PageSpeed Insights:** Consulta asíncrona paralela de rendimiento, accesibilidad y optimización SEO en dispositivos móviles mediante Lighthouse, con soporte a degradación elegante (*simulación*) en caso de límites de cuota (HTTP 429).
*   **Geolocalización y Latencia:** Ubicación geográfica física del servidor, mapa interactivo (Leaflet Dark Matter) y estimación de latencia de enrutamiento hacia México.
*   **Doble Variante de Elemento Incrustable (Widgets):**
    *   **Insignia Estática (`/widget`):** Badge responsivo que muestra el CMS verificado.
    *   **Buscador Compacto (`/search-widget`):** Caja de búsqueda y reporte simplificado Lighthouse/Leaflet incrustable en cualquier blog o sitio web de terceros.
    *   **Dashboard Embebido Completo (`/?embed=true`):** Carga la interfaz completa sin encabezados ni documentación para iframes fluidos de gran tamaño.
*   **Herramienta de Consola Interactiva (CLI):** Utilidad terminal interactiva para registrar firmas tecnológicas y realizar auditorías veloces individuales con filtros de propiedad.

---

## Requisitos Previos e Instalación

Asegúrate de contar con [Node.js](https://nodejs.org/) (versión 18 o superior) en tu sistema.

1.  Clona el repositorio en tu espacio local.
2.  Instala las dependencias necesarias:
    ```bash
    npm install
    ```
3.  (Opcional) Crea un archivo `.env` en la raíz del proyecto para configurar las variables del servidor, CORS/CSP, y el servicio de correo SMTP:
    ```env
    PORT=3000
    ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
    APP_URL=http://localhost:3000

    # Configuración de Servidor de Correo SMTP
    SMTP_HOST=smtp.mailgun.org
    SMTP_PORT=587
    SMTP_SECURE=false
    SMTP_USER=usuario@tu-dominio.com
    SMTP_PASS=tu-contrasena-smtp
    SMTP_FROM=noreply@tu-dominio.com
    SMTP_FROM_NAME="Rífatela Detector"

    # API Keys de Integración (Opcionales)
    LOGODEV_PUBLISHABLE_KEY=pk_...
    SCREENSHOTMACHINE_KEY=...
    ```

---

## Instrucciones de Ejecución

### Servidor de Producción / Desarrollo (Dashboard Web)
Inicia el servidor express en el puerto configurado:
```bash
npm run dev
```
Accede a la interfaz web ingresando a: **`http://localhost:3000`**

### Verificación de Firmas Locales (Tests)
Corre la suite de pruebas unitarias locales que evalúa el motor de expresiones regulares sobre sitios mock:
```bash
npm test
```

### Formateo y Linteo de Código (Biome)
El proyecto utiliza [Biome](https://biomejs.dev/) para garantizar la consistencia estética y de calidad del código:
```bash
# Analizar y verificar el código (Linter)
npm run lint

# Formatear archivos del proyecto (Formatter)
npm run format

# Analizar, formatear y aplicar auto-fixes seguros
npm run check
```

---

## Guía de Uso del CLI (`detector`)

La herramienta CLI del motor está registrada globalmente como `detector`. Puedes vincularla localmente con:
```bash
npm link
```
Una vez vinculada, puedes usar `detector` (o correrla vía `npx detector` desde el directorio):

### 1. Pruebas Rápidas de Dominio
Realiza un escaneo de CMS, aplicaciones, pasarelas de pago y geolocalización desde consola:
```bash
detector test-domain shopify.com
```

### 2. Filtrado de Propiedades Individuales (`--attr`)
Obtén únicamente el valor crudo en formato de texto o JSON de alguna propiedad específica de la auditoría (ideal para integraciones en Bash):
```bash
detector test-domain shopify.com --attr cms
```
*Atributos compatibles:* `cms`, `theme`, `productCount`, `plugins`, `infrastructure`, `paymentGateways`, `location`.

### 3. Registro Interactivo de Firmas
Si ejecutas los comandos de creación sin argumentos, la terminal iniciará un asistente interactivo con selectores visuales:
```bash
detector add-cms
detector add-app
detector add-infra
```
*   **Selector de Categorías:** Navega con las flechas del teclado `[↑/↓]`. La opción actual cambiará de color en tiempo real.
*   **Selector de CMS Compatibles:** Alterna y selecciona motores con la barra espaciadora `[Space]`.

---

## Documentación de la API REST

La especificación completa en formato OpenAPI 3.0 está disponible en [public/openapi.json](file:///Users/cesarayar/Documents/Desarrollo/Scrapper/public/openapi.json) o expuesta en el servidor en la ruta `/openapi.json`.

Todos los endpoints REST admiten validación de orígenes CORS y retornan respuestas JSON detalladas.

### 1. Escanear Sitio Web (POST)
*   **Endpoint:** `/api/detect`
*   **Método:** `POST`
*   **Body (JSON):**
    ```json
    { "url": "https://mi-tienda.com" }
    ```
*   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "url": "https://mi-tienda.com",
      "resolvedUrl": "https://mi-tienda.com/",
      "success": true,
      "detected": true,
      "technology": "Shopify",
      "confidence": 1.0,
      "theme": "Dawn",
      "plugins": [...],
      "infrastructure": [...],
      "paymentGateways": ["PayPal", "Stripe"],
      "location": { "success": true, "ip": "23.227.38.65", "ll": [45.0, -73.0], "country": "Canada" }
    }
    ```

### 2. Escanear Sitio Web (GET Query)
*   **Endpoint:** `/api/detect`
*   **Método:** `GET`
*   **Query Params:** `?url=https://mi-tienda.com`

### 3. Obtener Solo Infraestructura (GET / POST)
*   **Endpoint:** `/api/infra`
*   **Query Params:** `?url=https://mi-tienda.com`
*   **Respuesta (200 OK):**
    ```json
    {
      "success": true,
      "url": "https://mi-tienda.com/",
      "infrastructure": [
        { "name": "Cloudflare", "category": "CDN / Proxy / Seguridad" }
      ]
    }
    ```

### 4. Obtener Auditoría PageSpeed (GET / POST)
*   **Endpoint:** `/api/pagespeed`
*   **Query Params:** `?url=https://mi-tienda.com`
*   **Respuesta (200 OK):**
    ```json
    {
      "success": true,
      "scores": { "performance": 74, "accessibility": 88, "seo": 95 },
      "metrics": {
        "fcp": "1.7 s",
        "lcp": "3.1 s",
        "tbt": "180 ms",
        "cls": "0.03"
      }
    }
    ```

### 5. Enviar Reporte de Auditoría por Correo (POST)
*   **Endpoint:** `/api/report`
*   **Método:** `POST`
*   **Body (JSON):**
    ```json
    {
      "email": "usuario@correo.com",
      "name": "Juan Pérez",
      "data": {
        "resolvedUrl": "https://mi-tienda.com",
        "technology": "Shopify",
        "confidence": 1.0,
        "plugins": [],
        "infrastructure": []
      }
    }
    ```
*   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "success": true,
      "messageId": "<20260705-example-msg-id@yourdomain.com>"
    }
    ```

---

## Integraciones y Modos Embed (iFrames)

### 1. Insignia Estática de Verificación
Muestra un badge minimalista del CMS detectado de tu tienda:
```html
<iframe src="http://localhost:3000/widget?url=https://mi-tienda.com" width="320" height="120" style="border:none; border-radius:8px;"></iframe>
```

### 2. Buscador Compacto Incrustable (Widget)
Incrusta la caja de búsqueda y reporte simplificado Lighthouse/Leaflet:
```html
<iframe src="http://localhost:3000/search-widget" width="100%" height="480" style="border:1px solid rgba(255,255,255,0.1); border-radius:12px; background:#000;"></iframe>
```

### 3. Interfaz del Dashboard Completo (Modo Embed)
Carga el buscador y reporte original del dashboard sin barras de navegación ni documentación:
```html
<iframe src="http://localhost:3000/?embed=true" width="100%" height="700" style="border:1px solid rgba(255,255,255,0.1); border-radius:12px; background:#000;"></iframe>
```
*Autoinicio de escaneo:* Puedes pasar el parámetro `url` en la consulta para iniciar la auditoría al cargar: `http://localhost:3000/?embed=true&url=https://mi-tienda.com`

---

## Seguridad y Restricciones
*   **Seguridad iFrame:** El middleware del servidor restringe el embebido mediante la directiva `Content-Security-Policy: frame-ancestors 'self' <allowed_origins>`. Asegúrate de registrar tus dominios de producción en la variable de entorno `ALLOWED_ORIGINS` para habilitar el widget en tu web externa.

---

## Licencia

Este proyecto está bajo la licencia **GNU Affero General Public License v3.0 (AGPL-3.0)**. Consulta el archivo [LICENSE](file:///Users/cesarayar/Documents/Desarrollo/Scrapper/LICENSE) para obtener más información.
