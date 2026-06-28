# Bitacora de proyectos

La bitacora de proyectos es una extension de PULSO orientada a mejorar la trazabilidad. Permite consultar, desde el listado de proyectos, una linea de tiempo con los hitos principales del proyecto seleccionado.

## Objetivo

La funcionalidad resume la actividad relevante de un proyecto sin obligar al usuario a recorrer la ficha, el cliente, las tareas y el diagnostico por separado. La bitacora ayuda a responder rapidamente que paso, cuando paso y cual es el estado operativo actual.

## Alcance funcional

La bitacora muestra eventos de cuatro tipos:

| Tipo | Descripcion |
| --- | --- |
| `PROYECTO` | Creacion del proyecto y actualizaciones de su ficha. |
| `CLIENTE` | Cliente actualmente asociado o marca de proyecto interno. |
| `TAREA` | Creacion y actualizacion de tareas del proyecto. |
| `PULSO` | Diagnostico actual del proyecto, puntaje, avance y recomendacion. |

Cada evento incluye titulo, detalle, fecha e impacto. Los impactos disponibles son `ALTO`, `MEDIO`, `BAJO` y `NEUTRO`, y se usan en la interfaz para destacar visualmente los eventos mas relevantes.

## Flujo de uso

1. El usuario ingresa al listado de proyectos.
2. En la fila del proyecto, selecciona el boton de historial.
3. El frontend abre un dialogo modal y solicita la bitacora al backend.
4. La respuesta se renderiza como una linea de tiempo ordenada desde la actividad mas reciente.

## Endpoint

```http
GET /api/v1/proyectos/:id/bitacora
Authorization: Bearer <token>
```

Respuesta:

```json
{
  "proyectoId": 12,
  "proyecto": "Portal de clientes",
  "eventos": [
    {
      "id": "pulso-actual",
      "tipo": "PULSO",
      "titulo": "Pulso actual: Atencion",
      "detalle": "65/100 con 40% de avance. Revisar bloqueos y actualizar tareas en curso.",
      "fecha": "2026-06-26T18:30:00.000Z",
      "impacto": "MEDIO"
    }
  ]
}
```

Si el proyecto no existe, la API responde con error de validacion indicando `Proyecto no encontrado`.

## Implementacion

Backend:

- controlador: `backend/src/modules/gestion/controllers/proyectos.controller.ts`;
- servicio: `backend/src/modules/gestion/services/proyectos.service.ts`;
- DTO de salida: `backend/src/modules/gestion/dtos/output/bitacora-proyecto.dto.ts`.

Frontend:

- cliente HTTP: `frontend/src/app/proyectos/listado/proyectos-listado-api-client.ts`;
- DTO: `frontend/src/app/proyectos/listado/bitacora-proyecto-dto.ts`;
- dialogo y linea de tiempo: `frontend/src/app/proyectos/listado/proyectos-listado.html`;
- estado de carga, error e iconos: `frontend/src/app/proyectos/listado/proyectos-listado.ts`;
- estilos visuales: `frontend/src/app/proyectos/listado/proyectos-listado.css`.

## Criterios de diseno

La bitacora se calcula desde la informacion ya disponible del proyecto, sus tareas, cliente y pulso. No incorpora una tabla nueva ni guarda un historial independiente. Esta decision mantiene la extension simple y consistente con el alcance del TPI, aunque implica que la linea de tiempo representa el estado derivado actual y no una auditoria legal de todos los cambios realizados.
