# Autopub Bot

Bot de WhatsApp hecho sobre `Baileys`, enfocado en generar publicaciones visuales para `Variable Web`.

Hoy el proyecto está reducido a una base simple y reutilizable:
- conexión a WhatsApp
- comandos con prefijo `$`
- activación por grupo con clave
- generación de piezas visuales para publicaciones

## Qué hace

El bot permite:
- conectarse a WhatsApp con QR o código de emparejamiento
- responder sólo en los grupos donde lo prendas manualmente
- generar publicaciones con 3 moldes visuales
- enviar ejemplos de cada molde

## Estado actual

El bot arranca apagado en todos los grupos.

Para prenderlo en un grupo:

```text
$botprender Joa2302
```

Para apagarlo en un grupo:

```text
$botapagar Joa2302
```

Si la clave está mal, no se activa.

El estado queda guardado en:

```text
group-power-state.json
```

## Comandos

Comandos principales:

```text
$menu
$ping
$publicacion1
$pubejemplo1
$pubejemplo2
$pubejemplo3
```

## Publicación 1

`$publicacion1` soporta 3 moldes.

### Molde 1

```text
$publicacion1
Tipo: 1
Titulo: Landing Page
Subtitulo: Texto breve o -
```

### Molde 2

```text
$publicacion1
Tipo: 2
Titulo: Beneficios clave
item1: Texto corto
item2: Texto corto
item3: Texto corto
item4: Opcional
```

Nota:
- `item4` hoy se usa como descripción breve del bloque superior cuando está presente.

### Molde 3

```text
$publicacion1
Tipo: 3
Cita: Texto de la cita
Firma: Nombre corto
```

## Ejemplos rápidos

Para ver una muestra directa de cada diseño:

```text
$pubejemplo1
$pubejemplo2
$pubejemplo3
```

## Instalación

Requisitos:
- Node.js 20+
- una cuenta de WhatsApp para vincular

Instalar dependencias:

```bash
npm install
```

Iniciar el bot:

```bash
npm start
```

O en modo desarrollo:

```bash
npm run dev
```

## Primer arranque

Si no existe sesión guardada en `BotSession/`, el bot te va a pedir uno de estos métodos:
- QR
- código de emparejamiento

Cuando se vincula, la sesión queda guardada en:

```text
BotSession/
```

## Estructura del proyecto

Archivos principales:

```text
index.js
main.js
handler.js
config.js
services/publication1.js
```

Descripción rápida:
- `index.js`: healthcheck y arranque
- `main.js`: conexión con WhatsApp
- `handler.js`: comandos, activación por grupo y flujo del bot
- `services/publication1.js`: render de imágenes

## Dependencias

Principales:
- `@whiskeysockets/baileys`
- `sharp`
- `express`
- `pino`
- `chalk`

## Notas

- El prefijo principal actual es `$`.
- Por compatibilidad todavía se aceptan otros prefijos en algunas rutas internas.
- El bot fue limpiado para dejar sólo la base útil del proyecto original.
- El diseño de publicaciones está en evolución y se puede seguir afinando.

## Próximos pasos sugeridos

- separar `Descripcion:` de `item4` en el molde 2
- agregar más plantillas
- conectar generación por IA o assets externos
- restringir `$botprender` para que sólo lo pueda usar tu número
