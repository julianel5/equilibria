import { calcularAsignacion, type AsignacionResultado } from '../../../src/modules/pl/asignacion/asignacion.service';

function matrizDe(resultado: AsignacionResultado, tipo: AsignacionResultado['pasos'][number]['tipo']) {
  const paso = resultado.pasos.find(p => p.tipo === tipo);
  if (!paso) throw new Error(`Falta el paso ${tipo}`);
  return paso.matriz.map(fila => fila.map(valor => valor?.tex ?? null));
}

describe('Algoritmo húngaro', () => {
  it('traza mínimos, recubrimiento de König y las tres reglas de ajuste', () => {
    const res = calcularAsignacion({ costos: [['4', '1', '3'], ['2', '0', '5'], ['3', '2', '2']] });
    expect(res.estado).toBe('optimo');
    expect(res.valorObjetivo?.num).toBe('5');
    expect(res.iteraciones).toBe(1);
    expect(res.pasos.map(p => p.tipo)).toEqual(['original', 'filas', 'columnas', 'cobertura', 'ajuste', 'cobertura', 'asignacion']);
    expect(res.pasos[1]).toMatchObject({ minimos: [{ num: '1' }, { num: '0' }, { num: '2' }] });
    expect(matrizDe(res, 'filas')).toEqual([['3', '0', '2'], ['2', '0', '5'], ['1', '0', '0']]);
    expect(res.pasos[2]).toMatchObject({ minimos: [{ num: '1' }, { num: '0' }, { num: '0' }] });
    expect(matrizDe(res, 'columnas')).toEqual([['2', '0', '2'], ['1', '0', '5'], ['0', '0', '0']]);
    expect(res.pasos[3]).toMatchObject({ filas: [2], columnas: [1], iteracion: 1 });
    expect(res.pasos[4]).toMatchObject({ minimo: { num: '1', den: '1' } });
    expect(matrizDe(res, 'ajuste')).toEqual([['1', '0', '1'], ['0', '0', '4'], ['0', '1', '0']]);
    expect(res.asignaciones.map(({ i, j }) => [i, j])).toEqual([[0, 1], [1, 0], [2, 2]]);
  });

  it('reubica ceros elegidos por DFS cuando una elección voraz se atasca', () => {
    const res = calcularAsignacion({ costos: [['0', '0'], ['0', '5']] });
    expect(res.iteraciones).toBe(0);
    expect(res.asignaciones.map(({ i, j }) => [i, j])).toEqual([[0, 1], [1, 0]]);
  });

  it.each([false, true])('convierte solo beneficios reales permitidos antes de balancear (transpuesta=%s)', transpuesta => {
    const real = [['-4', '999', '-7'], ['-6', '-8', '-9']];
    const convertida = [['0', null, '3'], ['2', '4', '5']];
    const res = calcularAsignacion({
      costos: transpuesta ? real[0].map((_, j) => real.map(fila => fila[j])) : real,
      objetivo: 'max',
      prohibidas: [transpuesta ? { origen: 2, destino: 1 } : { origen: 1, destino: 2 }],
    });
    expect(res.estado).toBe('optimo');
    expect(res.valorObjetivo?.num).toBe('-12');
    expect(res.pasos[1]).toMatchObject({ tipo: 'conversion', maximo: { num: '-4' } });
    expect(matrizDe(res, 'conversion')).toEqual(transpuesta ? convertida[0].map((_, j) => convertida.map(fila => fila[j])) : convertida);
    expect(matrizDe(res, 'balanceo')).toEqual(transpuesta
      ? [['0', '2', '0'], [null, '4', '0'], ['3', '5', '0']]
      : [...convertida, ['0', '0', '0']]);
    expect(res.asignaciones.filter(a => a.ficticia)).toMatchObject([{ valor: { num: '0' } }]);
  });

  it('calcula fracciones y enteros fuera del rango de precisión de Number', () => {
    const res = calcularAsignacion({
      costos: [['9007199254740993', '9007199254740994'], ['1/2', '0,1']],
    });
    expect(res.valorObjetivo).toMatchObject({ num: '90071992547409931', den: '10' });
    const tercios = calcularAsignacion({ costos: [['1/3', '1'], ['1', '.2']] });
    expect(tercios.valorObjetivo).toEqual({ num: '8', den: '15', tex: '\\frac{8}{15}' });
    expect(() => JSON.stringify(tercios)).not.toThrow();
  });

  it('detecta un bloqueo colectivo aunque todas las filas y columnas tengan celdas permitidas', () => {
    const res = calcularAsignacion({
      costos: Array.from({ length: 3 }, () => ['1', '2', '3']),
      prohibidas: [
        { origen: 1, destino: 2 }, { origen: 1, destino: 3 },
        { origen: 2, destino: 2 }, { origen: 2, destino: 3 },
        { origen: 3, destino: 1 },
      ],
    });
    expect(res).toMatchObject({ estado: 'infactible', iteraciones: 0, valorObjetivo: null, asignaciones: [] });
    expect(res.pasos.map(p => p.tipo)).toEqual(['original', 'infactible']);
    expect(res.pasos[1]).toMatchObject({ cardinalidad: 2 });
  });

  it('devuelve infactibilidad con todas las celdas prohibidas, incluso al balancear una maximización', () => {
    const res = calcularAsignacion({
      costos: [['1', '2']], objetivo: 'max',
      prohibidas: [{ origen: 1, destino: 1 }, { origen: 1, destino: 2 }],
    });
    expect(res.estado).toBe('infactible');
    expect(res.pasos.map(p => p.tipo)).toEqual(['original', 'conversion', 'balanceo', 'infactible']);
    expect(res.pasos[1]).toMatchObject({ maximo: null });
  });

  it('rechaza entradas inválidas sin redondear ni rellenar datos', () => {
    for (const costos of [[], [['1'], ['2', '3']], [['']], [['1/0']], [['abc']], [[Infinity]]]) {
      expect(() => calcularAsignacion({ costos })).toThrow();
    }
    expect(calcularAsignacion({ costos: [[1]] }).valorObjetivo).toMatchObject({ num: '1', den: '1' });
    expect(() => calcularAsignacion({ costos: [['1']], prohibidas: [{ origen: 2, destino: 1 }] })).toThrow();
  });

  it('iguala una búsqueda exhaustiva en problemas pequeños y cubre todos los ceros en cada prueba', () => {
    let semilla = 6403;
    function aleatorio(limite: number) {
      semilla = (Math.imul(1664525, semilla) + 1013904223) >>> 0;
      return (semilla >>> 12) % limite;
    }
    for (let caso = 0; caso < 150; caso++) {
      const m = aleatorio(5) + 1;
      const n = aleatorio(5) + 1;
      const orden = Math.max(m, n);
      const costos = Array.from({ length: m }, () => Array.from({ length: n }, () => aleatorio(40) - 20));
      const permitidas = costos.map(fila => fila.map(() => aleatorio(4) !== 0));
      const prohibidas = permitidas.flatMap((fila, i) =>
        fila.flatMap((permitida, j) => permitida ? [] : [{ origen: i + 1, destino: j + 1 }])
      );
      const objetivo = caso % 2 === 0 ? 'min' : 'max';
      let esperado: number | null = null;
      function enumerar(i: number, usadas: number, total: number) {
        if (i === orden) {
          if (esperado === null || (objetivo === 'min' ? total < esperado : total > esperado)) esperado = total;
          return;
        }
        for (let j = 0; j < orden; j++) {
          if (!(usadas & (1 << j)) && (i >= m || j >= n || permitidas[i][j])) {
            enumerar(i + 1, usadas | (1 << j), total + (costos[i]?.[j] ?? 0));
          }
        }
      }
      enumerar(0, 0, 0);
      const res = calcularAsignacion({ costos: costos.map(fila => fila.map(String)), objetivo, prohibidas });
      expect(res.estado).toBe(esperado === null ? 'infactible' : 'optimo');
      expect(res.valorObjetivo?.num ?? null).toBe(esperado === null ? null : String(esperado));
      for (const paso of res.pasos) {
        if (paso.tipo !== 'cobertura') continue;
        paso.matriz.forEach((fila, i) => fila.forEach((v, j) => {
          if (v?.num === '0') expect(paso.filas.includes(i) || paso.columnas.includes(j)).toBe(true);
        }));
        function maxCeros(i: number, usadas: number): number {
          if (i === orden) return 0;
          let maximo = maxCeros(i + 1, usadas);
          for (let j = 0; j < orden; j++) {
            if (!(usadas & (1 << j)) && paso.matriz[i][j]?.num === '0') {
              maximo = Math.max(maximo, 1 + maxCeros(i + 1, usadas | (1 << j)));
            }
          }
          return maximo;
        }
        expect(paso.filas.length + paso.columnas.length).toBe(maxCeros(0, 0));
      }
    }
  });
});
