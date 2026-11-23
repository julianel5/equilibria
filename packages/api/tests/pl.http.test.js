const { once } = require('node:events');
const app = require('../dist/index').default;

let server;
let base;

beforeAll(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api/pl`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeIdleConnections?.();
  });
});

async function post(ruta, payload) {
  const res = await fetch(`${base}/${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

// Simplex, Gran M y Sensibilidad envían el mismo contrato a /api/pl/simplex.
describe('POST /api/pl/simplex', () => {
  const problema = {
    metodo: 'tabular', objetivo: 'max', funcionObjetivo: ['1/3', '-3.5'],
    restricciones: [
      { coeficientes: ['1', '0'], tipo: 'LE', b: '9007199254740993' },
      { coeficientes: ['0', '1'], tipo: 'LE', b: '10' },
    ],
  };

  test.each(['tabular', 'revisado'])('Simplex %s acepta strings sin perder precisión', async (metodo) => {
    const { status, body } = await post('simplex', { ...problema, metodo });
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, data: {
      estado: 'optimo', solucion: [{ num: '9007199254740993', den: '1' }, { num: '0', den: '1' }],
      valorObjetivo: { num: '3002399751580331', den: '1' },
      sensibilidad: { restricciones: [
        { b: { num: '9007199254740993', den: '1' }, precioSombra: { num: '1', den: '3' } },
        { b: { num: '10', den: '1' } },
      ] },
    } });
  });

  test('Gran M acepta el payload de la interfaz y usa una variable artificial', async () => {
    const { status, body } = await post('simplex', {
      metodo: 'tabular', objetivo: 'min', funcionObjetivo: ['10'],
      restricciones: [{ coeficientes: ['1/3'], tipo: 'GE', b: '0.5' }],
    });
    expect(status).toBe(200);
    expect(body.data).toMatchObject({
      estado: 'optimo', solucion: [{ num: '3', den: '2' }], valorObjetivo: { num: '15', den: '1' },
    });
    expect(body.data.tablas[0].zM.b.num).not.toBe('0');
  });

  test.each(['', '  ', '1/0', 'abc', '1.2.3'])('rechaza %j con HTTP 400 y la ruta del error', async (b) => {
    const { status, body } = await post('simplex', {
      ...problema, restricciones: [{ ...problema.restricciones[0], b }],
    });
    expect(status).toBe(400);
    expect(body.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'restricciones.0.b' }),
    ]));
  });
});

describe('Contratos numéricos de los demás endpoints PL', () => {
  test.each([
    ['dual', {
      objetivo: 'min', funcionObjetivo: ['1/3'],
      restricciones: [{ coeficientes: ['1'], tipo: 'GE', b: '1/3' }],
    }, { estado: 'optimo', valorObjetivo: { num: '1', den: '9' } }],
    ['grafico', {
      funcionObjetivo: { tipo: 'MAX', c1: '1/3', c2: '-3.5' },
      restricciones: [{ id: 'r1', x1: '1/3', x2: 0, operador: '<=', rhs: '1/3' }],
    }, { valorZ: 1 / 3, verticeOptimo: { x1: 1, x2: 0 } }],
    ['lemke', { tipo: 'lcp', M: [['1/3']], q: ['-1/3'] }, { estado: 'solucion' }],
    ['lemke', { tipo: 'qp', Q: [['1/3']], c: ['-1/3'], A: [['1']], b: ['1/3'] }, { estado: 'solucion' }],
    ['transporte', { costos: [['1/3']], oferta: ['1'], demanda: [1] }, {
      estado: 'optimo', valorObjetivo: { num: '1', den: '3' },
    }],
    ['asignacion', { costos: [[1, '1/3']], prohibidas: [{ origen: '1', destino: '2/2' }] }, {
      estado: 'optimo', valorObjetivo: { num: '1', den: '3' },
    }],
  ])('%s acepta los formatos del contrato', async (ruta, payload, esperado) => {
    const { status, body } = await post(ruta, payload);
    expect(status).toBe(200);
    expect(body.data).toMatchObject(esperado);
  });

  test.each([
    ['dual', { funcionObjetivo: ['1/0'], restricciones: [{ coeficientes: [1], b: 1 }] }],
    ['grafico', { funcionObjetivo: { tipo: 'MAX', c1: 'abc', c2: 0 }, restricciones: [{ id: 'r1', x1: 1, x2: 0, operador: '<=', rhs: 1 }] }],
    ['lemke', { tipo: 'qp', Q: [['1/0']], c: ['1'] }],
    ['transporte', { costos: [[1]], oferta: [1], demanda: [1], prohibidas: [{ origen: '1', destino: '1/2' }] }],
    ['asignacion', { costos: [[' ']] }],
  ])('%s rechaza valores inválidos con HTTP 400', async (ruta, payload) => {
    const { status, body } = await post(ruta, payload);
    expect(status).toBe(400);
    expect(body.issues.length).toBeGreaterThan(0);
  });
});
