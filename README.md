# Equilibria — Modelos de Investigación de Operaciones

Plataforma web para la resolución, visualización y análisis de modelos de Investigación de
Operaciones. Concentra el temario de IO en un solo lugar con rigor matemático, formulario
KaTeX renderizado, gráficas interactivas y un glosario de nomenclatura en cada módulo.

## Módulos disponibles

### Teoría de Inventarios

| Módulo | Ruta              | Descripción                                        |
| ------ | ----------------- | -------------------------------------------------- |
| EOQ    | `/inventory/eoq`  | Cantidad Económica de Pedido (Q*, costo total, N, T) |
| EPQ    | `/inventory/epq`  | Lote Económico de Producción                       |
| EOQ con Faltantes | `/inventory/eoq-faltantes` | Déficit autorizado (backorders)        |
| EOQ con Descuentos | `/inventory/eoq-descuentos` | Descuentos por cantidad y niveles de precio |

### Modelos Estocásticos

| Módulo             | Ruta                            | Descripción                                   |
| ------------------ | ------------------------------- | --------------------------------------------- |
| Demanda Probabilística | `/stochastic/punto-reorden`  | Punto de Reorden y Stock de Seguridad con curva normal |
| Teoría de Colas    | `/stochastic/teoria-colas`       | Sistemas M/M/1 y M/M/c con estabilidad, distribución P(n) y selector de unidad de tiempo |

La **Teoría de Colas** incluye:

- Verificación de estabilidad (ρ = λ/(cμ) < 1) con mensaje de error pedagógico cuando la cola crecería infinitamente.
- Métricas Wq, W, Lq, L, P0 y la distribución de probabilidad P_n (gráfica de barras).
- **Unidad de tiempo base** (horas por defecto, minutos o días) que etiqueta las tasas λ y μ, muestra los tiempos Wq y W con la unidad elegida y genera una conversión pedagógica (horas → minutos/segundos, minutos → segundos) calculada en el motor para mantener coherencia entre la UI y los resultados.

### Toma de Decisiones

| Módulo        | Ruta                     | Descripción                                        |
| ------------- | ------------------------ | -------------------------------------------------- |
| Matriz de Pagos | `/decisiones/matriz-pagos` | Criterios de decisión bajo incertidumbre (maximizar/minimizar) |

### Programación Lineal y Optimización _(próximamente)_

- Método Gráfico y Enumerativo
- Método Simplex y Simplex Revisado
- Penalización y Dos Fases (Charnes)
- Simplex Dual y Algoritmo de Lemke
- Análisis de Sensibilidad

### Modelos de Distribución y Redes _(próximamente)_

- Modelos de Transporte (Esquina Noroeste, Costo Mínimo, Vogel)
- Problema de Asignación (Algoritmo Húngaro)

## Funcionalidades transversales

- **Fórmulas matemáticas renderizadas con KaTeX** en todas las tarjetas y resultados.
- **Glosario de nomenclatura** accesible desde cada módulo.
- **Gráficas interactivas (Recharts)**: costos, distribución de probabilidad y curva normal.
- **Tema claro/oscuro** persistente, con detección del sistema.
- **Diseño responsivo** mobile-first con menú hamburguesa en pantallas pequeñas.

## Arquitectura

```
┌─────────────┐    REST    ┌─────────────┐   import   ┌─────────────┐
│  frontend   │ ─────────▶ │     api     │ ─────────▶ │    engine   │
│ (React 18)  │ ◀───────── │  (Express)  │ ◀───────── │  (TS puro)  │
└─────────────┘            └─────────────┘            └─────────────┘
   Tailwind CSS · Recharts · KaTeX
```

El motor matemático (`engine`) es 100% independiente de la UI: la API lo expone vía REST y el
frontend solo consume resultados. Todos los cálculos (incluidas etiquetas y conversiones de
unidad de tiempo) los genera el motor, de modo que UI y resultados permanecen coherentes.

### API

Base: `/api`

| Endpoint                         | Método | Descripción                          |
| -------------------------------- | ------ | ------------------------------------ |
| `/api/inventory/eoq`             | POST   | EOQ clásico                          |
| `/api/inventory/epq`             | POST   | Lote Económico de Producción         |
| `/api/inventory/eoq-faltantes`   | POST   | EOQ con déficit autorizado           |
| `/api/inventory/eoq-descuentos`  | POST   | EOQ con descuentos por cantidad      |
| `/api/stochastic/punto-reorden`  | POST   | Punto de Reorden y Stock de Seguridad |
| `/api/colas/evaluar`             | POST   | Teoría de Colas (M/M/1 y M/M/c)      |
| `/api/decisiones/evaluar`        | POST   | Matriz de Pagos (criterios de decisión) |

En producción (`NODE_ENV=production`) el mismo servicio sirve el frontend compilado desde
`packages/frontend/dist` con fallback SPA para rutas de React; el endpoint `/health` reporta
salud del servicio.

## Inicio rápido

```bash
# Instalar dependencias (monorepo)
npm install

# Probar el motor (Jest)
npm run test:engine

# Levantar API y engine en watch mode (API en el puerto 3001)
npm run dev:api

# Levantar frontend con Vite (puerto 5173, proxy /api → 3001)
npm run dev:frontend

# O todo a la vez (engine + API + frontend con concurrently)
npm run dev
```

> **Windows / PowerShell**: si `npm run` falla por la política de ejecución de scripts, usa
> `npm.cmd run ...` en su lugar. Al detener `npm run dev` en Windows, el aviso
> "¿Desea terminar el trabajo por lotes?" es normal (uno por proceso concurrente).

## Estructura

```
.
├── packages/
│   ├── engine/         Motor matemático puro (TS, sin dependencias de UI)
│   │   ├── src/modules/
│   │   │   ├── inventory/    eoq, epq, eoqFaltantes, eoqDescuentos
│   │   │   ├── stochastic/   demandaProbabilistica
│   │   │   ├── colas/        teoriaColas (M/M/1, M/M/c)
│   │   │   └── decisions/    teoriaDecisiones
│   │   └── tests/modules/    Pruebas de cada motor
│   ├── api/            API REST (Express)
│   └── frontend/       UI (React 18 + Tailwind + Recharts + KaTeX)
└── shared/             Componentes y utilidades compartidas (alias @shared/*)
    ├── components/     KpiCard, Formula, Glossary, CostChart, etc.
    └── types/          Tipos compartidos
```

## Despliegue

- `render.yaml`: blueprint de **Render** (plan free) que construye engine, API y frontend y
  levanta un único Web Service con la app completa.
- Cada `push` a `master` dispara el re-despliegue automático.
- Ejemplo: https://equilibria-vrhh.onrender.com/

## Pruebas

```bash
npm run test:engine     # Suite completa del motor matemático (Jest)
```

Las pruebas cubren los modelos EOQ/EPQ/faltantes/descuentos, demanda probabilística, teoría de
colas (incluidas estabilidad, distribución P(n) y conversiones de unidad de tiempo) y criterios
de decisión.