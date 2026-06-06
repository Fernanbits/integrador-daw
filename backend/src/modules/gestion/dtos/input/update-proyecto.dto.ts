import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { EstadosProyectosEnum } from '../../enums/estados-proyectos.enum';

export class UpdateProyectoDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsEnum(EstadosProyectosEnum)
  estado!: EstadosProyectosEnum;

  @IsOptional()
  @IsNumber()
  idCliente?: number;
}
