# Equilibria — Modelos de Investigación de Operaciones

Plataforma web para resolución, visualización y análisis de modelos de Investigación de Operaciones.

## Módulos planificados

- Teoría de Inventarios: EOQ (implementado), EPQ, faltantes planeados, descuentos por cantidad, demanda probabilística
- Toma de Decisiones
- Teoría de Colas

## Arquitectura

```
┌─────────────┐    REST    ┌─────────────┐   import   ┌─────────────┐
│  frontend   │ ─────────▶ │     api     │ ─────────▶ │    engine   │
│ (React 18)  │ ◀───────── │  (Express)  │ ◀───────── │  (TS puro)  │
└─────────────┘            └─────────────┘            └─────────────┘
   Tailwind CSS · Recharts · KaTeX
```

El motor matemático (`engine`) es 100% independiente de la UI. La API lo expone vía REST y el frontend solo consume resultados.

## Inicio rápido

```bash
# Instalar dependencias (monorepo)
npm install

# Probar el motor EOQ (Jest)
npm run test:engine

# Levantar API (puerto 3001)
npm run dev:api

# Levantar frontend (puerto 5173)
npm run dev:frontend
```

> **Windows / PowerShell**: si `npm run` falla por la política de ejecución de scripts,
> usa `npm.cmd run ...` en su lugar.

## Estructura

```
.
├── packages/
│   ├── engine/         Motor matemático puro (TS, sin dependencias de UI)
│   │   ├── src/modules/inventory/eoq.service.ts
│   │   └── tests/modules/inventory/eoq.service.test.ts
│   ├── api/            API REST (Express)
│   └── frontend/       UI (React 18 + Tailwind + Recharts + KaTeX)
└── shared/types/       Tipos compartidos
```

## Modelo EOQ implementado

- `Q* = √(2DS/H)` — Cantidad óptima de pedido
- `TC = (D/Q)S + (Q/2)H + DC` — Costo total anual
- `N = D/Q*` — Número de pedidos por año
- `T = 365/N` — Ciclo de reposición en días