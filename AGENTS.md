# Guía de Contribución y Reglas de Desarrollo - Chismógrafo

## 1. Convención de Commits (Conventional Commits)
Todos los commits deben redactarse obligatoriamente **en español** y seguir el formato `tipo(scope): descripción`:
- **Idioma**: La descripción y cuerpo del commit deben estar siempre en **español**, en minúsculas y modo imperativo/presente (ej. `feat(api): agregar soporte para...`, `fix(ui): corregir alineación...`).
- **Tipos**: `feat`, `fix`, `perf`, `refactor`, `style`, `docs`, `test`, `build`, `ci`, `chore`.
- **Scopes por Componente**:
  - `(techs)` o `(techs/<categoria>)`: Cambios, creación o actualización de plantillas de tecnologías y sus suites de pruebas (`techs/**`, `test/**`). Se debe especificar la categoría a la que se añade o modifica como información en la descripción o sub-scope (ej. `feat(techs): agregar plantilla para hotjar en apps`, `feat(techs/gateways): agregar pasarela afterpay`, `fix(techs/pixels): corregir patron de linkedin`).
  - `(cli)`: Cambios en el CLI de terminal (`cli/**`).
  - `(ui)` o `(frontend)`: Cambios en la interfaz web pública (`public/**`, `templates/**`).
  - `(api)` o `(backend)`: Cambios en el servidor o motor de detección (`server.js`, `src/**`, `api/**`).
  - `(deps)` / `(ci)` / `(repo)`: Configuración general y dependencias.

## 2. Versionado Semántico Independiente
- Cada componente (**CLI**, **Frontend** y **Backend**) lleva su propio número de versión en `version.json`.
- Al realizar un release en la rama `main`, `scripts/update-versions.js` evalúa los commits y rutas modificadas para incrementar únicamente la versión de los componentes que cambiaron.
- El archivo `CHANGELOG.md` se actualiza de manera automática mediante `semantic-release` agrupando todas las categorías de cambios.

## 3. Comandos Útiles de Verificación
- `npm test`: Ejecuta las pruebas automatizadas del motor de detección.
- `npm run check`: Ejecuta el linter y formateador Biome.
- `npm run versions`: Analiza los commits recientes y muestra el estado proyectado de versiones por componente.
- `npm run versions:dry`: Simula el cálculo de versiones sin modificar archivos.
- `node cli/bin/index.js version`: Muestra las versiones actuales de CLI, Interfaz (UI) y API REST.
