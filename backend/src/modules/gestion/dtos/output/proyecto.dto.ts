import { ApiProperty } from '@nestjs/swagger';
import { EstadosProyectosEnum } from '../../enums/estados-proyectos.enum';
import { ListTareaDTO } from './list-tarea.dto';
import { ListClienteDTO } from './list-cliente.dto';

export class ProyectoDTO {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  estado!: EstadosProyectosEnum;

  @ApiProperty({ type: () => ListClienteDTO })
  cliente?: ListClienteDTO;

  @ApiProperty({ type: () => [ListTareaDTO] })
  tareas!: ListTareaDTO[];
}
