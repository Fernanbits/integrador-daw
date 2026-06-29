import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';

import { CreateProyectoDto } from '../dtos/input/create-proyecto.dto';
import { UpdateProyectoDto } from '../dtos/input/update-proyecto.dto';

import { ListProyectosPaginadoDTO } from '../dtos/output/list-proyectos-paginado.dto';
import { ProyectoDTO } from '../dtos/output/proyecto.dto';
import { BitacoraProyectoDTO } from '../dtos/output/bitacora-proyecto.dto';
import { DashboardDTO } from '../dtos/output/dashboard.dto';

import { ProyectosService } from '../services/proyectos.service';
import { AuthGuard } from '../../auth/guards/auth.guard';

@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post()
  async crearProyecto(@Body() dto: CreateProyectoDto): Promise<{ id: number }> {
    return await this.proyectosService.crearProyecto(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Put(':id')
  async actualizarProyecto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProyectoDto,
  ): Promise<void> {
    await this.proyectosService.actualizarProyecto(id, dto);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: ListProyectosPaginadoDTO })
  @UseGuards(AuthGuard)
  @Get()
  async obtenerProyectos(
    @Query('search') search?: string,
    @Query('nombre') nombre?: string,
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDirection') sortDirection?: string,
  ): Promise<ListProyectosPaginadoDTO> {
    return await this.proyectosService.obtenerProyectos({
      search: search || nombre,
      estado,
      page,
      limit,
      sortBy,
      sortDirection,
    });
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: DashboardDTO })
  @UseGuards(AuthGuard)
  @Get('dashboard/resumen')
  async obtenerDashboard(): Promise<DashboardDTO> {
    return await this.proyectosService.obtenerDashboard();
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: BitacoraProyectoDTO })
  @UseGuards(AuthGuard)
  @Get(':id/bitacora')
  async obtenerBitacoraProyecto(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BitacoraProyectoDTO> {
    return await this.proyectosService.obtenerBitacoraProyecto(id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: ProyectoDTO })
  @UseGuards(AuthGuard)
  @Get(':id')
  async obtenerProyecto(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProyectoDTO> {
    return await this.proyectosService.obtenerProyecto(id);
  }
}
