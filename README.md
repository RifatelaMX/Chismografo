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

## Guía de Uso del CLI (`chismografo`)

La herramienta CLI del Chismógrafo está registrada como `chismografo`. Puedes vincularla localmente con:
```bash
npm link
```
Una vez vinculada, puedes usar `chismografo` (o correrla vía `npx chismografo` desde el directorio):

### 1. Pruebas Rápidas de Dominio
Sácale el chisme tecnológico a cualquier sitio desde la consola:
```bash
chismografo test-domain shopify.com
```

### 2. Filtrado de Propiedades Individuales (`--attr`)
Pide solo el dato chismoso que te interese (ideal para integraciones en Bash):
```bash
chismografo test-domain shopify.com --attr cms
```
*Atributos compatibles:* `cms`, `theme`, `productCount`, `plugins`, `infrastructure`, `paymentGateways`, `location`.

### 3. Registro Interactivo de Firmas
Si ejecutas los comandos de creación sin argumentos, el Chismógrafo abrirá un asistente interactivo con selectores visuales:
```bash
chismografo add-cms
chismografo add-app
chismografo add-infra
```
*   **Selector de Categorías:** Navega con las flechas del teclado `[↑/↓]`. La opción actual cambiará de color en tiempo real.
*   **Selector de CMS Compatibles:** Alterna y selecciona motores con la barra espaciadora `[Space]`.

---

## Documentación de la API REST 🤓

La especificación completa del chisme en formato OpenAPI 3.0 está disponible en [public/openapi.json](file:///Users/cesarayar/Documents/Desarrollo/Scrapper/public/openapi.json) o expuesta en el servidor en la ruta `/openapi.json`.

Todos los endpoints REST admiten validación de orígenes CORS y retornan respuestas JSON detalladas de todo lo que le cachamos al sitio web objetivo.

### 1. Sacarle el chisme a un sitio (POST) 🕵️
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

### 2. Sacarle el chisme a un sitio (GET) 🕵️
*   **Endpoint:** `/api/detect`
*   **Método:** `GET`
*   **Query Params:** `?url=https://mi-tienda.com`

### 3. Obtener solo la infraestructura de red (GET / POST) 🏗️
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

### 4. Checar velocidad con PageSpeed (GET / POST) ⚡
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

### 5. Mandar reporte del chisme por correo (POST) 📬
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

## Integraciones y Modos Embed (iFrames) 🏷️

### 1. Calcomanía Estática de Verificación (Sticker)
Muestra un badge responsivo en forma de post-it amarillo con el CMS detectado:
```html
<iframe src="http://localhost:3000/widget?url=https://mi-tienda.com" width="320" height="120" style="border:none; border-radius:12px;"></iframe>
```

### 2. Buscador de Chismes Compacto (Widget)
Incrusta la caja de búsqueda y reporte simplificado en estilo cuaderno Y2K:
```html
<iframe src="http://localhost:3000/search-widget" width="100%" height="480" style="border:2px solid #b8d4e3; border-radius:12px; background:#fdf6e3;"></iframe>
```

### 3. Interfaz del Dashboard Completo (Modo Embed)
Carga el buscador y reporte original del dashboard sin cabecera ni documentación:
```html
<iframe src="http://localhost:3000/?embed=true" width="100%" height="700" style="border:2px solid #b8d4e3; border-radius:12px; background:#fdf6e3;"></iframe>
```
*Autoinicio de escaneo:* Puedes pasar el parámetro `url` en la consulta para iniciar el chisme automáticamente al cargar: `http://localhost:3000/?embed=true&url=https://mi-tienda.com`

## Catálogo de Firmas y Reglas de Detección 📜

El Chismógrafo utiliza un motor modular basado en firmas JSON para identificar qué tecnologías se ejecutan en un sitio web. Las firmas se clasifican en cuatro carpetas dentro del directorio `techs/`:
*   `techs/cms/`: Gestores de contenido (Shopify, Magento, WooCommerce, etc.).
*   `techs/apps/`: Aplicaciones de terceros, plugins y scripts instalados.
*   `techs/infra/`: Servidores web, CDN, Proxies e infraestructura general.
*   `techs/gateways/`: Pasarelas y proveedores de procesamiento de pagos.

---

### 1. Reglas de Detección (`detectionRules`)
Cada firma JSON define una lista de reglas (`detectionRules`) que especifican qué buscar en las cabeceras HTTP o en el HTML de la página web. Cada regla admite los siguientes parámetros:

*   `type` (Requerido): Tipo de regla de coincidencia.
*   `pattern` (Requerido): Expresión regular (Regex) utilizada para realizar la búsqueda.
*   `description` (Opcional): Comentario de ayuda que describe lo que la regla intenta capturar.
*   `weight` (Opcional, por defecto `0.5`): Multiplicador de confianza (`0.0` a `1.0`) para calcular la probabilidad total de acierto de la tecnología.

#### Tipos de Reglas Soportadas:
1.  **`meta`**: Analiza etiquetas HTML `<meta>` en la cabecera.
    *   *Propiedades requeridas:* `key` (nombre o propiedad de la metaetiqueta).
    *   *Ejemplo:*
        ```json
        { "type": "meta", "key": "generator", "pattern": "shopify", "weight": 1.0 }
        ```
2.  **`script-src`**: Inspecciona el atributo `src` de los scripts de la página.
    *   *Ejemplo:*
        ```json
        { "type": "script-src", "pattern": "paypalobjects\\.com/api/checkout\\.js" }
        ```
3.  **`script-content`**: Analiza el contenido interno de las etiquetas `<script>` inline de JavaScript.
    *   *Ejemplo:*
        ```json
        { "type": "script-content", "pattern": "window\\.ShopifyAnalytics" }
        ```
4.  **`link-href`**: Inspecciona el atributo `href` en las etiquetas `<link>` (estilos, preconnect, etc.).
    *   *Ejemplo:*
        ```json
        { "type": "link-href", "pattern": "cdn\\.shopify\\.com" }
        ```
5.  **`html-class`**: Analiza las clases presentes en los elementos del DOM.
    *   *Ejemplo:*
        ```json
        { "type": "html-class", "pattern": "theme-editor-active" }
        ```
6.  **`html-attribute`**: Evalúa atributos específicos en cualquier elemento HTML.
    *   *Propiedades requeridas:* `attribute` (nombre del atributo a inspeccionar).
    *   *Ejemplo:*
        ```json
        { "type": "html-attribute", "attribute": "data-store-id", "pattern": "^\\d+$" }
        ```
7.  **`header`**: Compara cabeceras de respuesta HTTP (ej. cookies, servidores, etc.).
    *   *Propiedades requeridas:* `key` (nombre de la cabecera).
    *   *Ejemplo:*
        ```json
        { "type": "header", "key": "x-powered-by", "pattern": "Express" }
        ```

---

### 2. Uso de Plantillas (`templates/`)
El Chismógrafo incluye plantillas pre-formateadas dentro del directorio `templates/` para facilitar la creación uniforme de firmas:
*   `templates/cms.json`: Para gestores de contenido base.
*   `templates/app.json`: Para plugins y extensiones de tiendas.
*   `templates/infra.json`: Para proveedores de red y CDNs.
*   `templates/gateway.json`: Para pasarelas de cobro y billeteras electrónicas.

Estas plantillas contienen marcadores especiales (placeholders) como `{{name}}`, `{{slug}}`, `{{web}}` y `{{logo}}` que son rellenados automáticamente cuando ejecutas los comandos interactivos del CLI:
*   `chismografo add-cms`
*   `chismografo add-app`
*   `chismografo add-infra`
*   `chismografo add-gateway`

Una vez creada la nueva firma, ejecuta `chismografo build-index` para fusionar y compilar todas las firmas individuales en el índice centralizado `techs/index.json`.

---

## Seguridad y Restricciones
*   **Seguridad iFrame:** El middleware del servidor restringe el embebido mediante la directiva `Content-Security-Policy: frame-ancestors 'self' <allowed_origins>`. Asegúrate de registrar tus dominios de producción en la variable de entorno `ALLOWED_ORIGINS` para habilitar el widget en tu web externa.

---

## Licencia

Este proyecto está bajo la licencia **GNU Affero General Public License v3.0 (AGPL-3.0)**. Consulta el archivo [LICENSE](file:///Users/cesarayar/Documents/Desarrollo/Scrapper/LICENSE) para obtener más información.
