## [1.9.0](https://github.com/RifatelaMX/Chismografo/compare/v1.8.2...v1.9.0) (2026-09-02)

### ✨ Nuevas Características

* **ui:** consumir logos de json y habilitar modal de resultados de tests para apps ([592146b](https://github.com/RifatelaMX/Chismografo/commit/592146bfa447a50041b327214e1d782749e55593))

## [1.8.2](https://github.com/RifatelaMX/Chismografo/compare/v1.8.1...v1.8.2) (2026-09-01)

### 🐛 Corrección de Errores

* **ui:** corregir error de sintaxis por bloque duplicado en app.js ([62917b9](https://github.com/RifatelaMX/Chismografo/commit/62917b924fbeb0d82f91d5530a22a93545abb09a))

## [1.8.1](https://github.com/RifatelaMX/Chismografo/compare/v1.8.0...v1.8.1) (2026-09-01)

### 🐛 Corrección de Errores

* **api:** optimizar tiempos de respuesta y evitar bloqueos en escaneo de dominios ([397bbba](https://github.com/RifatelaMX/Chismografo/commit/397bbbaba077d72d5abd2bb095fb18c01a12094a))

## [1.8.0](https://github.com/RifatelaMX/Chismografo/compare/v1.7.2...v1.8.0) (2026-09-01)

### ✨ Nuevas Características

* **frontend:** integrar soporte completo y cascada para todos los proveedores de logos ([771c175](https://github.com/RifatelaMX/Chismografo/commit/771c175a8069bfc0efbea76a6c02aa7c7aa8ebd2))

## [1.7.2](https://github.com/RifatelaMX/Chismografo/compare/v1.7.1...v1.7.2) (2026-09-01)

### 🐛 Corrección de Errores

* **ui:** resolver logos usando google favicons hd y corregir dominio de loox ([f5664ed](https://github.com/RifatelaMX/Chismografo/commit/f5664ed9aa41b62978ccc1c3c6f28eb8e3e6dda0))

## [1.7.1](https://github.com/RifatelaMX/Chismografo/compare/v1.7.0...v1.7.1) (2026-09-01)

### 🐛 Corrección de Errores

* **ui:** corregir cierre de tarjeta principal de resultados y extraccion de dominio para logos ([19ac2fd](https://github.com/RifatelaMX/Chismografo/commit/19ac2fda27997753f8edf88c6fe20132ba376345))

## [1.7.0](https://github.com/RifatelaMX/Chismografo/compare/v1.6.2...v1.7.0) (2026-09-01)

### ✨ Nuevas Características

* **ui:** permitir ver detalles de examenes aprobados y reprobados al hacer clic en el reporte ([c18eea0](https://github.com/RifatelaMX/Chismografo/commit/c18eea04cb31572f8d67540ef86d0b935ad620a9))

## [1.6.2](https://github.com/RifatelaMX/Chismografo/compare/v1.6.1...v1.6.2) (2026-09-01)

### 🐛 Corrección de Errores

* **ui:** mejorar resolución de logos y cadena de fallback multinivel ([d5a751f](https://github.com/RifatelaMX/Chismografo/commit/d5a751f5a297dd9e6647fa6cdf90ef3a371f4876))

## [1.6.1](https://github.com/RifatelaMX/Chismografo/compare/v1.6.0...v1.6.1) (2026-09-01)

### ♻️ Refactorización

* reformat JSON technology files using tabs for consistent indentation ([57f6d35](https://github.com/RifatelaMX/Chismografo/commit/57f6d354e7f74738bfb0033bd1362d40fbc3c8a1))

## [1.6.0](https://github.com/RifatelaMX/Chismografo/compare/v1.5.0...v1.6.0) (2026-09-01)

### ✨ Nuevas Características

* add configuration files for nine new technology detection apps ([02baee5](https://github.com/RifatelaMX/Chismografo/commit/02baee53e27ee10bafd0e107f6e7ffd8333e3041))
* add support for pixel categories and implement GitHub PR submission for new tool definitions with improved logo handling logic. ([8aee3c5](https://github.com/RifatelaMX/Chismografo/commit/8aee3c59c3c270712087100ab9a950c449595868))

## [1.5.0](https://github.com/RifatelaMX/Chismografo/compare/v1.4.1...v1.5.0) (2026-09-01)

### ✨ Nuevas Características

* add multi-service logo fallback handler, update map tiles, and improve configuration management ([a06feb5](https://github.com/RifatelaMX/Chismografo/commit/a06feb5b248311cb3fb4adb67a935ba0318b50ef))
* add technology directory API endpoint and interactive UI for tool management ([5e71382](https://github.com/RifatelaMX/Chismografo/commit/5e713822ac4d05a17e6e4967f71e61b2856fbb40))
* implement directory filtering by category and CMS and reorganize technology tracking definitions. ([1e8a184](https://github.com/RifatelaMX/Chismografo/commit/1e8a18492cdd15f55e0f4df1a898df7957deaf78))
* implement persistent report sharing via JSON storage and automated 7-day cleanup cron job ([1abac0f](https://github.com/RifatelaMX/Chismografo/commit/1abac0fa3524625d23b9ce2a2f132a49305038cc))
* implement tracking pixel detection and add support for major advertising platforms ([612b5c6](https://github.com/RifatelaMX/Chismografo/commit/612b5c657e1807e5fa342726374b9cc1d16c85ca))

### ♻️ Refactorización

* standardize logo schema across technology definitions and add Vercel cron cleanup endpoint ([b91cbed](https://github.com/RifatelaMX/Chismografo/commit/b91cbed5a4ef82b3b33bb7c9a64442f07e8a0a24))
* update technology categories, improve detection metadata, and synchronize app definitions. ([9c2641d](https://github.com/RifatelaMX/Chismografo/commit/9c2641da22ea108113056a58b1e46da7065fbce5))

### 🤖 Integración Continua (CI/CD)

* actualizar actions/checkout a v5 para soporte de Node.js 24 ([2b9ec71](https://github.com/RifatelaMX/Chismografo/commit/2b9ec71e7615ca103df9a517ade7f7d6709e9d9f))
* actualizar actions/checkout a v7 ([a5eb9b8](https://github.com/RifatelaMX/Chismografo/commit/a5eb9b839372b0b2a674580460754835233e8b85))
* actualizar actions/setup-node a v7 ([73c3771](https://github.com/RifatelaMX/Chismografo/commit/73c377158cadac5380280f0908f0a134defa8b57))

## [1.4.1](https://github.com/RifatelaMX/Chismografo/compare/v1.4.0...v1.4.1) (2026-08-30)

### 📝 Documentación

* **repo:** establecer como regla obligatoria los comentarios de commits en español ([9718b5d](https://github.com/RifatelaMX/Chismografo/commit/9718b5d565cd23d4fc1ee81c7b6fc83b86a82291))

## [1.4.0](https://github.com/RifatelaMX/Chismografo/compare/v1.3.0...v1.4.0) (2026-08-30)

### ✨ Nuevas Características

* add Brevo API support for transactional emails and refactor email service configuration ([b6dcd28](https://github.com/RifatelaMX/Chismografo/commit/b6dcd283ba25b1d05457c98c8e3da203d57f52ab))
* add free screenshot provider fallback using Microlink and mshots APIs ([b26187c](https://github.com/RifatelaMX/Chismografo/commit/b26187c8e36c73a6b4e77beedf3a3a8f043caf48))

### 🐛 Corrección de Errores

* **ci:** align conventionalcommits preset version and translate release notes to Spanish ([16c62eb](https://github.com/RifatelaMX/Chismografo/commit/16c62ebaff499f107ce0d47bb04d4198423f8c15))

### ♻️ Refactorización

* **email:** enhance SMTP and Brevo error handling and add project contribution guidelines ([fffb212](https://github.com/RifatelaMX/Chismografo/commit/fffb21283dbab1a0f19681cbba34168f2408119a))

# [1.3.0](https://github.com/RifatelaMX/Chismografo/compare/v1.2.0...v1.3.0) (2026-08-29)


### Features

* add Vercel deployment support and configuration ([81ead00](https://github.com/RifatelaMX/Chismografo/commit/81ead00154b3e4e1acc04b7ee3b0253414f841e8))

# [1.2.0](https://github.com/RifatelaMX/Chismografo/compare/v1.1.0...v1.2.0) (2026-08-23)


### Features

* implement agent skills infrastructure and subagent framework for automated maintenance ([7b6a354](https://github.com/RifatelaMX/Chismografo/commit/7b6a3543bc759d7b8c9c7a3c220b5898022d3830))

# [1.1.0](https://github.com/cesar-ayar/Chismografo/compare/v1.0.1...v1.1.0) (2026-07-13)


### Features

* update tech icon resolution to prioritize direct logo URLs and support custom logo dev formatting ([9d74ec9](https://github.com/cesar-ayar/Chismografo/commit/9d74ec97f9be94aefa85624bec59fe6829567c1b))

## [1.0.1](https://github.com/cesar-ayar/Chismografo/compare/v1.0.0...v1.0.1) (2026-07-13)


### Bug Fixes

* handle read-only filesystem errors when writing unified index.json ([952f6ca](https://github.com/cesar-ayar/Chismografo/commit/952f6cabd3cd968996f6acba325ffbbdb5d6f3c9))

# 1.0.0 (2026-07-13)


### Features

* add chismografo origin and restyle email notification templates ([2c02dd4](https://github.com/cesar-ayar/Chismografo/commit/2c02dd4b83e61cb625bb41843b7a0d73e18d3578))
* add ENABLE_SCREENSHOTS toggle and update ALLOWED_ORIGINS configuration ([a89bbc8](https://github.com/cesar-ayar/Chismografo/commit/a89bbc84bccd943ad51aa89979dd138b99ee86b7))
