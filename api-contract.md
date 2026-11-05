# Urabá Crea — contrato inicial para coordinar Frontend, Backend y API

## Arquitectura de tres capas
1. **Presentación:** HTML5, CSS3, Bootstrap 5 y JavaScript.
2. **Lógica de negocio:** backend/API REST. Autentica, autoriza, valida stock, procesa pedidos.
3. **Datos:** base de datos relacional, propuesta inicial MySQL.

El navegador intercambia JSON con el backend mediante HTTPS. El frontend no debe conectarse directamente a MySQL ni guardar contraseñas en `localStorage`.

## Endpoints propuestos
| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/products` | Catálogo público |
| GET | `/api/products/:id` | Detalle de producto |
| POST | `/api/seller/products` | Crear producto del artesano autenticado |
| PUT | `/api/seller/products/:id` | Editar producto propio |
| DELETE | `/api/seller/products/:id` | Eliminar/desactivar producto propio |
| GET | `/api/seller/inventory` | Ver inventario propio |
| PATCH | `/api/seller/products/:id/stock` | Ajustar existencias |
| POST | `/api/orders` | Crear pedido y validar stock en una transacción |
| GET | `/api/orders/:id` | Consultar pedido con permisos adecuados |

## Ejemplo JSON de producto
```json
{
  "name": "Canasto de fibras naturales",
  "description": "Tejido artesanal con fibras naturales.",
  "category": "Tejidos",
  "material": "Fibras naturales",
  "price": 68000,
  "stock": 8,
  "imageUrl": "/uploads/canasto.jpg"
}
```

Al crear o editar un producto, el servidor debe tomar el `seller_id` desde la sesión autenticada; no debe confiar en un identificador de artesano enviado por el cliente.

## Reglas críticas
- Solo un artesano autenticado puede crear productos.
- El servidor comprueba que un producto pertenece a ese artesano antes de actualizarlo o eliminarlo.
- Validar precio mayor que cero, stock entero no negativo y datos de entrada.
- Descontar existencias al confirmar una compra dentro de una transacción para prevenir sobreventa.
- No enviar contraseñas en claro ni guardarlas en el navegador.
- Usar HTTPS y autenticación de sesión/token con prácticas seguras.
