# orders-service

Orquesta el proceso de compra de EntradasYa. Es propietario de `orders_db`; no accede directamente a las bases de otros servicios.

## Flujo

1. Crea una orden `PENDING` en el paso `CREATED`.
2. Reserva capacidad en `events-service` y conserva el precio confirmado.
3. Consulta primero si ya existe un pago para el `orderId` y evita cobrar dos veces.
4. Procesa el pago cuando todavía no existe una transacción.
5. Ante rechazo, libera el cupo y marca la orden `REJECTED`.
6. Ante aprobación, marca la orden `PAID` antes de emitir entradas.
7. Emite las entradas de forma recuperable y solicita el correo de confirmación.
8. Un fallo de correo no invalida la compra.

Los datos completos de la tarjeta solo viajan a `payments-service`; nunca se guardan en `orders_db` ni se escriben en logs.

## Estados

- Estado: `PENDING`, `PAID`, `REJECTED` o `CANCELLED`.
- Progreso: `CREATED`, `CAPACITY_RESERVED`, `PAYMENT_APPROVED`, `TICKETS_ISSUED` o `COMPLETED`.

Una orden pagada no vuelve a pendiente. `POST /orders/:id/retry` continúa desde el progreso persistido sin repetir pasos terminados.

## Endpoints

| Método | Ruta | Acceso | Uso |
|---|---|---|---|
| `POST` | `/orders` | Cliente | Crear y procesar una compra |
| `GET` | `/orders` | Cliente | Historial propio |
| `GET` | `/orders/:id` | Cliente propietario | Detalle propio |
| `POST` | `/orders/:id/retry` | Cliente propietario | Recuperar una compra incompleta |
| `GET` | `/organizer/events/:eventId/sales` | Organizador propietario | Resumen de ventas |
| `GET` | `/health/live` | Público local | Estado del proceso |
| `GET` | `/health/ready` | Público local | Disponibilidad de PostgreSQL |

Ejemplo para crear una orden:

```json
{
  "eventId": "UUID",
  "sectorId": "UUID",
  "quantity": 2,
  "payment": {
    "cardNumber": "4111111111111111",
    "cardHolder": "CLIENTE PRUEBA",
    "expiryMonth": 12,
    "expiryYear": 2030,
    "cvv": "123"
  }
}
```

## Base de datos local

1. Cambia `change-me` en `.env` y en `../../scripts/database/03-create-orders-database.sql`.
2. Ejecuta ese SQL con una cuenta administradora de PostgreSQL.
3. Desde la raíz ejecuta `pnpm db:orders:deploy`.

## Desarrollo

```bash
pnpm --filter orders-service dev
pnpm --filter orders-service test
pnpm --filter orders-service test:e2e
pnpm --filter orders-service build
```

El flujo real completo necesita que `events-service`, `payments-service`, `tickets-service` y `notifications-service` estén ejecutándose y compartan el mismo `INTERNAL_API_KEY`.
