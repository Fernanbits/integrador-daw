import { ApiProperty } from '@nestjs/swagger';

export type TipoBitacoraProyecto = 'PROYECTO' | 'CLIENTE' | 'TAREA' | 'PULSO';
export type ImpactoBitacoraProyecto = 'ALTO' | 'MEDIO' | 'BAJO' | 'NEUTRO';

export class BitacoraProyectoItemDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['PROYECTO', 'CLIENTE', 'TAREA', 'PULSO'] })
  tipo!: TipoBitacoraProyecto;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  detalle!: string;

  @ApiProperty()
  fecha!: Date;

  @ApiProperty({ enum: ['ALTO', 'MEDIO', 'BAJO', 'NEUTRO'] })
  impacto!: ImpactoBitacoraProyecto;
}

export class BitacoraProyectoDTO {
  @ApiProperty()
  proyectoId!: number;

  @ApiProperty()
  proyecto!: string;

  @ApiProperty({ type: () => BitacoraProyectoItemDTO, isArray: true })
  eventos!: BitacoraProyectoItemDTO[];
}
