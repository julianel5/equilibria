/** Entrada fuera del dominio del modelo; puede comunicarse al usuario. */
export class ErrorValidacion extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErrorValidacion';
  }
}
