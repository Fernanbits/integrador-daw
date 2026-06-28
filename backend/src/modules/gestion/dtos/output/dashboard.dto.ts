import { ApiProperty } from '@nestjs/swagger';
import { EstadosTareasEnum } from '../../enums/estados-tareas.enum';
import { PrioridadesTareasEnum } from '../../enums/prioridades-tareas.enum';

export class DashboardTareasDTO {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  pendientes!: number;

  @ApiProperty()
  enProgreso!: number;

  @ApiProperty()
  finalizadas!: number;

  @ApiProperty()
  vencidas!: number;

  @ApiProperty()
  proximasAVencer!: number;

  @ApiProperty()
  altaPrioridad!: number;
}

export class DashboardPulsoDTO {
  @ApiProperty()
  estables!: number;

  @ApiProperty()
  atencion!: number;

  @ApiProperty()
  criticos!: number;

  @ApiProperty()
  sinDatos!: number;

  @ApiProperty()
  cerrados!: number;

  @ApiProperty()
  pausados!: number;
}

export class DashboardProyectoRiesgoDTO {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  estado!: string;

  @ApiProperty()
  nivel!: string;

  @ApiProperty()
  puntaje!: number;

  @ApiProperty()
  avance!: number;

  @ApiProperty()
  recomendacion!: string;
}

export class DashboardTareaVencimientoDTO {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  descripcion!: string;

  @ApiProperty({ enum: EstadosTareasEnum })
  estado!: EstadosTareasEnum;

  @ApiProperty({ enum: PrioridadesTareasEnum })
  prioridad!: PrioridadesTareasEnum;

  @ApiProperty()
  fechaVencimiento!: Date;

  @ApiProperty()
  proyectoId!: number;

  @ApiProperty()
  proyecto!: string;
}

export class DashboardDTO {
  @ApiProperty()
  totalProyectos!: number;

  @ApiProperty()
  activos!: number;

  @ApiProperty()
  finalizados!: number;

  @ApiProperty()
  bajas!: number;

  @ApiProperty()
  internos!: number;

  @ApiProperty({ type: () => DashboardTareasDTO })
  tareas!: DashboardTareasDTO;

  @ApiProperty({ type: () => DashboardPulsoDTO })
  pulso!: DashboardPulsoDTO;

  @ApiProperty({ type: () => DashboardProyectoRiesgoDTO, isArray: true })
  proyectosEnRiesgo!: DashboardProyectoRiesgoDTO[];

  @ApiProperty({ type: () => DashboardTareaVencimientoDTO, isArray: true })
  proximosVencimientos!: DashboardTareaVencimientoDTO[];
}
