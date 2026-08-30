# Regla: Conventional Commits y Versionado por Componente

## 1. Convención Obligatoria de Commits
Todo commit en este repositorio **DEBE** seguir estrictamente la especificación de **Conventional Commits** y redactarse **en español**:

```
<tipo>(<scope>): <descripción concisa en español, minúsculas y presente>
```

> **Regla de Idioma**: Tanto el mensaje principal (`subject`) como cualquier nota o cuerpo extendido del commit deben redactarse en **español**.

### Tipos Permitidos
- `feat`: Nueva funcionalidad o capacidad añadida (incrementa versión MINOR).
- `fix`: Corrección de un error o bug (incrementa versión PATCH).
- `perf`: Mejora de rendimiento (incrementa versión PATCH).
- `refactor`: Refactorización de código sin cambio funcional (incrementa versión PATCH).
- `style`: Ajustes visuales, CSS o formateo sin cambio de lógica (incrementa versión PATCH).
- `docs`: Cambios exclusivamente en documentación (README, guías, jsdoc).
- `test`: Añadir o modificar pruebas unitarias/de integración.
- `chore`: Tareas de mantenimiento, dependencias o configuración interna.
- `ci` / `build`: Cambios en pipelines de CI/CD o scripts de construcción.

### Breaking Changes (Cambios Disruptivos)
Si un cambio rompe compatibilidad hacia atrás:
- Usar `!` después del tipo o scope: ej. `feat(api)!: eliminar endpoint v1`
- O incluir `BREAKING CHANGE: <explicación>` en el cuerpo del commit.
- Esto incrementará la versión **MAJOR** del componente afectado.

---

## 2. Scopes Obligatorios por Componente

Para que el analizador de versiones determine qué componente actualizar de forma independiente, se debe especificar el scope adecuado:

| Componente | Scopes válidos | Rutas asociadas |
| :--- | :--- | :--- |
| **CLI** | `(cli)`, `(terminal)`, `(bin)` | `cli/**` |
| **Frontend** | `(ui)`, `(frontend)`, `(front)`, `(web)`, `(client)`, `(widget)` | `public/**`, `templates/**` |
| **Backend** | `(api)`, `(backend)`, `(server)`, `(core)`, `(detector)`, `(email)` | `server.js`, `api/**`, `src/**`, `techs/**` |
| **Transversal** | `(deps)`, `(repo)`, `(release)`, `(ci)` | Raíz del proyecto |

### Ejemplos de Commits Válidos
```bash
feat(cli): agregar flag --json para exportar detecciones
fix(ui): solucionar overflow horizontal en resultados móviles
feat(api): integrar proveedor alternativo de capturas sin token
fix(api): validar correctamente formato de correos salientes
refactor(ui): modularizar componentes de visualización en app.js
docs: actualizar diagrama de arquitectura en README.md
chore(deps): actualizar axios y cheerio a la última versión
```

---

## 3. Automatización de Release en `main`
- Cada `push` a la rama `main` activa el workflow de Semantic Release.
- Se compila automáticamente el CHANGELOG.md clasificando todos los commits en sus secciones correspondientes.
- Se ejecuta `scripts/update-versions.js` para actualizar version.json y public/openapi.json.
- **Nunca modificar manualmente `version.json` o `CHANGELOG.md` en commits normales**: el pipeline de release lo gestiona de forma automática.
