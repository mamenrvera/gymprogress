# GymProgress

Aplicación web progresiva (PWA) para control personal de nutrición, entrenamiento de fuerza y análisis de progreso. Funciona completamente offline una vez cargada, sin depender de servicios externos.

## Características principales

- **Nutrición**: Registro de alimentos por gramos, base de datos personal de alimentos, calorías declaradas vs estimadas (4-4-9), instantáneas que conservan historial
- **Entrenamiento**: Sesiones planificadas/en curso/completadas, series con peso/repeticiones/RIR, volumen y 1RM (Epley), biblioteca de ejercicios
- **Progreso**: KPIs semanales/mensuales, gráficas de volumen/fuerza/nutrición, evolución peso corporal e IMC, comparativas periodo anterior
- **PWA instalable**: Funciona offline, se instala como app nativa en móvil/escritorio
- **Privacidad total**: Datos en IndexedDB (Dexie) en tu navegador, sin nube ni cuentas

## Requisitos

- Node.js 20+ (incluido en versión portable en `C:\Users\Mamen\AppData\Local\nodejs-portable\node-v24.22.1-win-x64`)
- Navegador moderno (Chrome, Edge, Firefox, Safari)

## Inicio rápido

### Opción 1: Script batch (cmd.exe)
```cmd
start.bat
```

### Opción 2: Script PowerShell
```powershell
.\start.ps1
```

### Opción 3: Manual
```cmd
set PATH=C:\Users\Mamen\AppData\Local\nodejs-portable\node-v24.22.1-win-x64;%PATH%
cd gymprogress
npm.cmd run dev
```

El servidor arranca en `http://0.0.0.0:5173` (accesible desde LAN).

## Acceso desde móvil (LAN)

1. Conecta el móvil a la misma WiFi que el ordenador
2. Averigua la IP local del ordenador:
   ```cmd
   ipconfig | findstr IPv4
   ```
3. En el navegador del móvil, abre: `http://<IP-ORDENADOR>:5173`
   - Ejemplo: `http://192.168.1.175:5173`

## Instalación como PWA

### En Android (Chrome/Edge)
1. Abre la URL LAN en Chrome
2. Menú (⋮) → "Instalar aplicación" / "Add to Home screen"
3. Confirma la instalación

### En iPhone/iPad (Safari)
1. Abre la URL LAN en Safari
2. Botón Compartir (□↑) → "Añadir a pantalla de inicio"
3. Confirma

> **Nota importante**: La instalación completa (Service Worker, offline real) requiere **HTTPS** o **localhost**. En LAN sobre HTTP plano, el navegador permite "Añadir a pantalla de inicio" pero el Service Worker no se registra (contexto no seguro). Para PWA completa en móvil:
> - Usa `localhost` en el propio ordenador
> - O configura HTTPS local con `mkcert` + reverse proxy
> - O expón via túnel seguro (ngrok, Cloudflare Tunnel)

## Perfil inicial (configuración por defecto)

- Peso: 63 kg
- Altura: 163 cm
- Objetivo: Recomposición (perder grasa / ganar músculo)
- Calorías: 1400 kcal/día
- Proteínas: 125 g
- Grasas: 40 g
- Carbohidratos: 90 g (rango 85–95 g)

> **Aviso**: Los macros suman ~1220 kcal (125×4 + 40×9 + 90×4), mientras que el objetivo calórico es 1400 kcal. La app **no recalcula automáticamente**; las cuatro metas son independientes y editables en Ajustes.

## Estructura del proyecto

```
gymprogress/
├── src/
│   ├── components/       # UI components (nutrición, entrenamiento, UI base)
│   ├── context/          # AppContext (settings, theme, toasts, fecha)
│   ├── lib/              # Lógica pura: cálculos, BD, repositorios, fechas, formatos
│   ├── pages/            # Páginas: Inicio, Alimentación, Entrenamiento, Progreso, Ajustes
│   ├── types.ts          # Tipos TypeScript centrales
│   └── main.tsx          # Entry point
├── public/               # Iconos PWA, manifest
├── e2e/                  # Tests Playwright
├── dist/                 # Build producción (generado)
├── package.json
├── vite.config.ts        # Config Vite + PWA + Vitest
├── playwright.config.ts  # Config E2E
├── tsconfig.json
├── tailwind.config.js
├── start.bat             # Launcher Windows (cmd)
└── start.ps1             # Launcher Windows (PowerShell)
```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm.cmd run dev` | Servidor desarrollo en `0.0.0.0:5173` (LAN) |
| `npm.cmd run build` | Build producción en `dist/` (PWA con SW) |
| `npm.cmd run preview` | Previsualiza build producción en `0.0.0.0:4173` |
| `npm.cmd test` | Tests unitarios (Vitest, 74 tests) |
| `npm.cmd run test:e2e` | Tests E2E (Playwright, 5 flujos) |
| `npm.cmd run test:e2e:ui` | Playwright con UI visual |

## Tecnologías

- React 18 + TypeScript + Vite 6
- Tailwind CSS 3 (modo oscuro por defecto)
- Dexie.js 4 (IndexedDB reactiva)
- Recharts 2 (gráficas)
- React Hook Form 7 + Zod 3 (formularios validados)
- Lucide React (iconos)
- Vitest 3 (unitarios)
- Playwright 1.49 (E2E)
- vite-plugin-pwa (Service Worker, Workbox)

## Datos y persistencia

- **IndexedDB** (Dexie): `settings`, `foods`, `entries`, `exercises`, `workouts`, `workoutExercises`, `sets`, `bodyWeights`
- **Exportar/Importar**: JSON completo desde Ajustes → Datos y copias de seguridad
- **Borrado selectivo**: "Borrar historial" elimina comidas, sesiones, series y pesajes; conserva alimentos, ejercicios y ajustes
- **Restablecer todo**: Vuelve a valores iniciales de fábrica

## Tests

```cmd
# Unitarios (74 tests)
npm.cmd test

# E2E (5 flujos: nutrición, entrenamiento, ajustes, peso, móvil)
npm.cmd run test:e2e
```

## Licencia

MIT