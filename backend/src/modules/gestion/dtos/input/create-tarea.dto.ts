import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PrioridadesTareasEnum } from '../../enums/prioridades-tareas.enum';

export class CreateTareaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @ApiProperty({
    enum: PrioridadesTareasEnum,
    example: PrioridadesTareasEnum.MEDIA,
    required: false,
  })
  @IsEnum(PrioridadesTareasEnum)
  @IsOptional()
  prioridad?: PrioridadesTareasEnum;

  @ApiProperty({ example: '2026-07-15', required: false })
  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string | null;
}
