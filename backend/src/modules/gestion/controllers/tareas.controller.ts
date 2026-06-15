import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CreateTareaDto } from '../dtos/input/create-tarea.dto';
import { UpdateTareaDto } from '../dtos/input/update-tarea.dto';
import { TareasService } from '../services/tarea.service';
import { AuthGuard } from '../../auth/guards/auth.guard';

@Controller('proyectos/:idProyecto/tareas')
export class TareasController {
  constructor(private readonly tareasService: TareasService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post()
  async crearTarea(
    @Body() dto: CreateTareaDto,
    @Param('idProyecto') idProyecto: number,
  ): Promise<{ id: number }> {
    return await this.tareasService.crearTarea(dto, idProyecto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get()
  async obtenerTareas(
    @Param('idProyecto') idProyecto: number,
    @Query('estado') estado?: string,
  ) {
    return await this.tareasService.obtenerTareas(idProyecto, estado);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Put(':id')
  async actualizarTarea(
    @Body() dto: UpdateTareaDto,
    @Param('id') id: number,
  ): Promise<void> {
    await this.tareasService.actualizarTarea(dto, id);
  }
}  