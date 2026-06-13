import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Proyecto } from '../entities/proyecto.entity';
import { Cliente } from '../entities/cliente.entity';
import { CreateProyectoDto } from '../dtos/input/create-proyecto.dto';
import { UpdateProyectoDto } from '../dtos/input/update-proyecto.dto';
import { EstadosProyectosEnum } from '../enums/estados-proyectos.enum';
import { EstadosClientesEnum } from '../enums/estados-clientes.enum';
import { EstadosTareasEnum } from '../enums/estados-tareas.enum';

import { ListProyectoDTO } from '../dtos/output/list-proyecto.dto';
import { ProyectoDTO } from '../dtos/output/proyecto.dto';
import { ListClienteDTO } from '../dtos/output/list-cliente.dto';

//  importar Tarea 
import { Tarea } from '../entities/tarea.entity';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private readonly repository: Repository<Proyecto>,

    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,

    @InjectRepository(Tarea)
    private readonly tareaRepository: Repository<Tarea>,
  ) {}

  async crearProyecto(dto: CreateProyectoDto): Promise<{ id: number }> {
    const proyecto: Proyecto = this.repository.create(dto);
    proyecto.estado = EstadosProyectosEnum.ACTIVO;

    if (dto.idCliente) {
      const clienteActivo = await this.clienteRepository.exists({
        where: { id: dto.idCliente, estado: EstadosClientesEnum.ACTIVO },
      });

      if (!clienteActivo) {
        throw new BadRequestException(
          'Se debe especificar un cliente activo para el proyecto',
        );
      }
    }

    await this.repository.save(proyecto);
    return { id: proyecto.id };
  }

  async actualizarProyecto(id: number, dto: UpdateProyectoDto): Promise<void> {
    const proyecto = await this.repository.findOne({
      where: { id },
    });

    if (!proyecto) {
      throw new BadRequestException('Proyecto no encontrado');
    }

    if (dto.idCliente) {
      const clienteActivo = await this.clienteRepository.exists({
        where: { id: dto.idCliente, estado: EstadosClientesEnum.ACTIVO },
      });

      if (!clienteActivo) {
        throw new BadRequestException(
          'Se debe especificar un cliente activo para el proyecto',
        );
      }
    }

    const dtoClean = { ...dto };

    if (dtoClean.idCliente === null) {
      delete dtoClean.idCliente;
    }

    this.repository.merge(proyecto, dtoClean);
    await this.repository.save(proyecto);
  }

  async obtenerProyectos(): Promise<ListProyectoDTO[]> {
    const proyectos = await this.repository.find({
      relations: {
        cliente: true, 
      },
    });

    return proyectos.map((p) => {
      const dto = new ListProyectoDTO();
      dto.id = p.id;
      dto.nombre = p.nombre;
      dto.estado = p.estado as EstadosProyectosEnum;

      if (p.cliente) {
        dto.cliente = new ListClienteDTO();
        dto.cliente.id = p.cliente.id;
        dto.cliente.nombre = p.cliente.nombre;
        dto.cliente.estado = p.cliente.estado;
      }

      return dto;
    });
  }

  async obtenerProyecto(id: number): Promise<ProyectoDTO> {
    const proyecto = await this.repository.findOne({
      where: { id },
      relations: {
        cliente: true,
        tareas: true, 
      },
    });

    if (!proyecto) {
      throw new BadRequestException('Proyecto no encontrado');
    }

    if (proyecto.estado === EstadosProyectosEnum.FINALIZADO) {
      const tareasPendientes = await this.tareaRepository.count({
        where: {
          proyecto: { id: proyecto.id },
          estado: EstadosTareasEnum.PENDIENTE,
        },
      });

      if (tareasPendientes > 0) {
        throw new BadRequestException(
          'No se puede finalizar el proyecto porque tiene tareas pendientes',
        );
      }
    }

    const dto = new ProyectoDTO();
    dto.nombre = proyecto.nombre;
    dto.estado = proyecto.estado as EstadosProyectosEnum;
    dto.cliente = proyecto.cliente?.nombre ?? '';

    return dto;
  }

  async existeProyectoPorIdCliente(idCliente: number): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('p')
      .where('p.clienteId = :idCliente', { idCliente })
      .andWhere('p.estado IN (:...estados)', {
        estados: [
          EstadosProyectosEnum.ACTIVO,
          EstadosProyectosEnum.FINALIZADO,
        ],
      })
      .getCount();

    return count > 0;
  }
}