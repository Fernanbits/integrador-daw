# Guion de presentacion - PULSO

Duracion objetivo: 9 a 10 minutos. El reparto es una propuesta y puede intercambiarse sin modificar la estructura de la exposicion.

## 1. Apertura y busqueda avanzada - Gustavo Minchiotti

**Tiempo sugerido:** 2 minutos y 15 segundos.

1. Presentar el problema: una consultora necesita administrar proyectos, clientes y tareas sin sumar complejidad operativa.
2. Explicar que PULSO resuelve el flujo completo desde una aplicacion web responsive.
3. Iniciar sesion y mostrar el listado de proyectos.
4. Demostrar busqueda por nombre, filtro por estado, ordenamiento y cambio de pagina.
5. Aclarar que el filtrado y la paginacion se procesan en el backend para evitar cargar todos los registros en el navegador.

**Idea fuerza:** la busqueda avanzada permite llegar al proyecto correcto con pocos pasos y mantiene buen rendimiento al crecer los datos.

## 2. Gestion base y exportacion CSV - Alicia Viviana Montenegro

**Tiempo sugerido:** 2 minutos.

1. Crear o editar un cliente y explicar sus estados.
2. Crear o editar un proyecto y asociarlo a un cliente activo.
3. Mostrar la opcion de exportar los proyectos visibles.
4. Explicar que el CSV respeta la vista filtrada y puede utilizarse en una planilla o para generar reportes externos.

**Idea fuerza:** la exportacion convierte la informacion operativa en un dato reutilizable fuera del sistema.

## 3. Seguimiento y estadisticas - Francisco López

**Tiempo sugerido:** 2 minutos.

1. Abrir el detalle de tareas de un proyecto.
2. Senalar las metricas de total, pendientes, en progreso, finalizadas y porcentaje de avance.
3. Crear o editar una tarea para mostrar como se actualiza el resumen.
4. Explicar que los indicadores permiten conocer la situacion del proyecto sin revisar cada tarea individualmente.

**Idea fuerza:** las metricas transforman registros aislados en informacion util para decidir.

## 4. Kanban, arquitectura y cierre - María Jimena Fernández

**Tiempo sugerido:** 2 minutos y 45 segundos.

1. Recorrer las columnas del tablero Kanban y buscar una tarea por descripcion.
2. Cambiar una tarea de estado y mostrar su nueva ubicacion.
3. Resumir la arquitectura: Angular consume una API REST en NestJS, TypeORM conecta con PostgreSQL y JWT protege el acceso.
4. Mencionar el despliegue separado de frontend y backend en Vercel y la base alojada en Neon.
5. Cerrar destacando que se cumplieron los requerimientos base y se agregaron cuatro expansiones funcionales.

**Idea fuerza:** el Kanban hace visible el flujo de trabajo y la arquitectura permite mantener separadas la interfaz, la logica y los datos.

## Recorrido recomendado para la demo

1. Login.
2. Listado, filtros, ordenamiento y paginacion de proyectos.
3. Alta o edicion de cliente y proyecto.
4. Exportacion CSV.
5. Detalle de tareas, metricas y Kanban.
6. Cierre con arquitectura y despliegue.

## Preparacion antes de grabar

- verificar que la aplicacion publicada responda;
- tener disponibles las credenciales de demostracion;
- cargar datos con distintos estados para que filtros y metricas resulten visibles;
- cerrar pestañas y notificaciones que no formen parte de la demo;
- ensayar una vez con cronometro;
- grabar en 1080p y comprobar audio, camaras y texto legible;
- evitar editar datos criticos durante la grabacion: usar registros preparados para la demostracion.

## Preguntas que pueden aparecer

**¿Por que la paginacion se realiza en el backend?**

Porque reduce el volumen transferido y permite mantener tiempos de respuesta predecibles cuando aumenta la cantidad de proyectos.

**¿Como se protege la aplicacion?**

El usuario se autentica y recibe un token JWT. El frontend lo incorpora en las solicitudes y el backend valida el acceso mediante guards.

**¿Por que se eligio PostgreSQL?**

El dominio tiene relaciones claras entre clientes, proyectos y tareas. Una base relacional permite modelarlas y asegurar su integridad.

**¿Que aporta separar frontend y backend?**

Cada capa tiene una responsabilidad concreta, puede desplegarse y evolucionar de manera independiente y mantiene aisladas las credenciales de la base.

**¿Como se evita exponer secretos?**

Las credenciales se almacenan como variables de entorno en cada plataforma. Los archivos locales, respaldos y configuraciones sensibles estan excluidos de Git.
