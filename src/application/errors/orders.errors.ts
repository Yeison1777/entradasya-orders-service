export class OrderNotFoundError extends Error {
  constructor() {
    super('La orden no existe o no pertenece al usuario.');
  }
}

export class OrderNotRetryableError extends Error {
  constructor() {
    super('La orden ya terminó y no puede reintentarse.');
  }
}

export class PaymentDataRequiredError extends Error {
  constructor() {
    super('Se requieren los datos de pago para continuar la orden.');
  }
}

export class SoldOutError extends Error {
  constructor() {
    super('No existe cupo suficiente en el sector seleccionado.');
  }
}

export class EventOwnershipError extends Error {
  constructor() {
    super('El evento no pertenece al organizador autenticado.');
  }
}

export class DependencyUnavailableError extends Error {
  constructor(
    public readonly dependency: string,
    message = `El servicio ${dependency} no está disponible.`,
  ) {
    super(message);
  }
}
