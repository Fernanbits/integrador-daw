import { ApiProperty } from '@nestjs/swagger';
import { EstadosTareasEnum } from '../../enums/estados-tareas.enum';
import { PrioridadesTareasEnum } from '../../enums/prioridades-tareas.enum';

export class ListTareaDTO {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  descripcion!: string;

  @ApiProperty()
  estado!: EstadosTareasEnum;

  @ApiProperty({ enum: PrioridadesTareasEnum })
  prioridad!: PrioridadesTareasEnum;

  @ApiProperty({ required: false, nullable: true })
  fechaVencimiento!: Date | null;
}
