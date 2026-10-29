function mcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/**
 * Fracción exacta (aritmética entera con BigInt) para el módulo Simplex.
 *
 * Todos los cálculos del tablero (pivoteo, prueba de la razón mínima, inversa
 * básica) usan SOLO este tipo: queda prohibido el punto flotante en las
 * operaciones matriciales. Los números de la entrada se convierten a partir de
 * su representación decimal exacta (p. ej. 2.25 -> 9/4) y cada operación
 * devuelve la fracción irreducible (1/3, nunca 0.333).
 */
export class Frac {
  readonly num: bigint;
  readonly den: bigint;

  constructor(num: bigint | number | string, den: bigint | number | string = 1n) {
    let n = BigInt(num);
    let d = BigInt(den);
    if (d === 0n) throw new Error('El denominador de una fracción no puede ser 0');
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = mcd(n, d);
    if (g > 1n) {
      n /= g;
      d /= g;
    }
    this.num = n;
    this.den = d;
  }

  static readonly CERO = new Frac(0);
  static readonly UNO = new Frac(1);

  get esCero(): boolean {
    return this.num === 0n;
  }

  get esEntero(): boolean {
    return this.den === 1n;
  }

  get esPositivo(): boolean {
    return this.num > 0n;
  }

  get esNegativo(): boolean {
    return this.num < 0n;
  }

  get signo(): number {
    return this.num < 0n ? -1 : this.num > 0n ? 1 : 0;
  }

  /** Convierte una entrada numérica (decimal) a su fracción exacta. */
  static deDecimal(valor: number): Frac {
    if (!Number.isFinite(valor)) {
      throw new Error('Los coeficientes deben ser números finitos');
    }
    if (valor === 0) return Frac.CERO;

    // String(value) entrega la representación decimal más corta que reconvierte
    // al mismo double: p. ej. 0.5 -> "0.5", 2.25 -> "2.25", 1e21 -> "1e+21".
    let s = String(valor);
    let exponente = 0n;
    const idxExp = s.search(/[eE]/);
    if (idxExp >= 0) {
      exponente = BigInt(Math.trunc(Number(s.slice(idxExp + 1))));
      s = s.slice(0, idxExp);
    }
    const [intPart = '0', fracPart = ''] = s.split('.');
    const negativo = intPart.startsWith('-');
    const digitos = intPart.replace('-', '') + fracPart;
    let num = BigInt(digitos === '' ? '0' : digitos);
    if (negativo) num = -num;
    let den = 1n;
    if (fracPart.length > 0) den = 10n ** BigInt(fracPart.length);
    if (exponente >= 0n) num = num * 10n ** exponente;
    else den = den * 10n ** -exponente;
    return new Frac(num, den);
  }

  neg(): Frac {
    return new Frac(-this.num, this.den);
  }

  inv(): Frac {
    return new Frac(this.den, this.num);
  }

  add(other: Frac): Frac {
    return new Frac(this.num * other.den + other.num * this.den, this.den * other.den);
  }

  sub(other: Frac): Frac {
    return new Frac(this.num * other.den - other.num * this.den, this.den * other.den);
  }

  mul(other: Frac): Frac {
    return new Frac(this.num * other.num, this.den * other.den);
  }

  div(other: Frac): Frac {
    return new Frac(this.num * other.den, this.den * other.num);
  }

  /** -1 si this < other, 0 si iguales, 1 si this > other. */
  cmp(other: Frac): number {
    const izq = this.num * other.den;
    const der = other.num * this.den;
    return izq < der ? -1 : izq > der ? 1 : 0;
  }

  equals(other: Frac): boolean {
    return this.num === other.num && this.den === other.den;
  }

  /** Aproximación decimal solo para mostrar (nunca se usa en los cálculos). */
  toNumber(): number {
    return Number(this.num) / Number(this.den);
  }

  /** Representación decimal de visualización, sin agrupar. */
  toDec(maxDigitos = 6): string {
    const n = this.toNumber();
    if (Number.isInteger(n)) return String(n);
    return n
      .toFixed(maxDigitos)
      .replace(/0+$/, '')
      .replace(/\.$/, '');
  }

  /** LaTeX: \frac{3}{2} o -\frac{3}{2}; entero -> 3. */
  toTex(): string {
    if (this.esEntero) return this.num.toString();
    if (this.esNegativo) return `-\\frac{${-this.num}}{${this.den}}`;
    return `\\frac{${this.num}}{${this.den}}`;
  }

  toString(): string {
    return this.esEntero ? this.num.toString() : `${this.num}/${this.den}`;
  }
}