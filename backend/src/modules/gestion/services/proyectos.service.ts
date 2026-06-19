import { InjectRepository } from '@nestjs/typeorm';
import { CreateProyectoDto } from '../dtos/input/create-proyecto.dto';
import { Proyecto } from '../entities/proyecto.entity';
import { Repository, In } from 'typeorm';
import { EstadosProyectosEnum } from '../enums/estados-proyectos.enum';
import { UpdateProyectoDto } from '../dtos/input/update-proyecto.dto';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ListProyectoDTO } from '../dtos/output/list-proyecto.dto';
import { ProyectoDTO } from '../dtos/output/proyecto.dto';
import { ClientesService } from './clientes.service';
import { ListClienteDTO } from '../dtos/output/list-cliente.dto';
import { ListProyectosPaginadoDTO } from '../dtos/output/list-proyectos-paginado.dto';
import { ResumenProyectosDTO } from '../dtos/output/resumen-proyectos.dto';
import { Cliente } from '../entities/cliente.entity';

type ObtenerProyectosParams = {
  search?: string;
  estado?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortDirection?: string;
};

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private readonly repository: Repository<Proyecto>,
    @Inject(forwardRef(() => ClientesService))
    private readonly clientesService: ClientesService,
  ) {}

  async crearProyecto(dto: CreateProyectoDto): Promise<{ id: number }> {
    if (dto.idCliente) {
      const clienteActivo: boolean =
        await this.clientesService.existeClienteActivoPorId(dto.idCliente);

      if (!clienteActivo) {
        throw new BadRequestException(
          'Se debe especificar un cliente activo para el proyecto',
        );
      }
    }

    const proyecto: Proyecto = this.repository.create({
      nombre: dto.nombre,
      estado: EstadosProyectosEnum.ACTIVO,
      cliente: dto.idCliente ? ({ id: dto.idCliente } as Cliente) : null,
    });

    await this.repository.save(proyecto);
    return { id: proyecto.id };
  }

  async actualizarProyecto(id: number, dto: UpdateProyectoDto): Promise<void> {
    const proyecto: Proyecto | null = await this.repository.findOne({
      where: { id },
    });

    if (!proyecto) {
      throw new BadRequestException('Proyecto no encontrado');
    }

    if (dto.idCliente) {
      const clienteActivo: boolean =
        await this.clientesService.existeClienteActivoPorId(dto.idCliente);

      if (!clienteActivo) {
        throw new BadRequestException(
          'Se debe especificar un cliente activo para el proyecto',
        );
      }
    }

    proyecto.nombre = dto.nombre;
    proyecto.estado = dto.estado;

    if ('idCliente' in dto) {
      proyecto.cliente = dto.idCliente
        ? ({ id: dto.idCliente } as Cliente)
        : null;
    }

    await this.repository.save(proyecto);
  }

  async obtenerProyectos(
    params: ObtenerProyectosParams = {},
  ): Promise<ListProyectosPaginadoDTO> {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 5, 1), 100);
    const sortColumns: Record<string, string> = {
      id: 'proyecto.id',
      nombre: 'proyecto.nombre',
      estado: 'proyecto.estado',
      cliente: 'cliente.nombre',
    };
    const sortBy = sortColumns[params.sortBy || 'id'] || sortColumns.id;
    const sortDirection =
      params.sortDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const query = this.repository
      .createQueryBuilder('proyecto')
      .leftJoinAndSelect('proyecto.cliente', 'cliente');

    if (params.search?.trim()) {
      query.andWhere('LOWER(proyecto.nombre) LIKE LOWER(:search)', {
        search: `%${params.search.trim()}%`,
      });
    }

    if (params.estado?.trim()) {
      query.andWhere('proyecto.estado = :estado', {
        estado: params.estado.trim(),
      });
    }

    const resumenRaw = await query
      .clone()
      .select(
        'COUNT(*) FILTER (WHERE proyecto.estado = :estadoActivo)',
        'activos',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE proyecto.estado = :estadoFinalizado)',
        'finalizados',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE proyecto.estado = :estadoBaja)',
        'bajas',
      )
      .addSelect('COUNT(*) FILTER (WHERE cliente.id IS NULL)', 'internos')
      .setParameters({
        estadoActivo: EstadosProyectosEnum.ACTIVO,
        estadoFinalizado: EstadosProyectosEnum.FINALIZADO,
        estadoBaja: EstadosProyectosEnum.BAJA,
      })
      .getRawOne<{
        activos: string;
        finalizados: string;
        bajas: string;
        internos: string;
      }>();

    query
      .orderBy(sortBy, sortDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [proyectos, total] = await query.getManyAndCount();

    const data = proyectos.map((p) => {
      const dto = new ListProyectoDTO();
      dto.id = p.id;
      dto.nombre = p.nombre;
      dto.estado = p.estado;

      if (p.cliente) {
        dto.cliente = new ListClienteDTO();
        dto.cliente.id = p.cliente.id;
        dto.cliente.nombre = p.cliente.nombre;
        dto.cliente.estado = p.cliente.estado;
      }
      return dto;
    });

    const resumen: ResumenProyectosDTO = {
      activos: Number(resumenRaw?.activos ?? 0),
      finalizados: Number(resumenRaw?.finalizados ?? 0),
      bajas: Number(resumenRaw?.bajas ?? 0),
      internos: Number(resumenRaw?.internos ?? 0),
    };

    return {
      data,
      total,
      page,
      limit,
      lastPage: Math.max(Math.ceil(total / limit), 1),
      resumen,
    };
  }

  async obtenerProyecto(id: number): Promise<ProyectoDTO> {
    const p: Proyecto | null = await this.repository.findOne({
      where: { id },
      relations: { cliente: true },
    });

    if (!p) {
      throw new BadRequestException('Proyecto no encontrado');
    }

    const dto = new ProyectoDTO();
    dto.id = p.id;
    dto.nombre = p.nombre;
    dto.estado = p.estado;

    if (p.cliente) {
      dto.cliente = new ListClienteDTO();
      dto.cliente.id = p.cliente.id;
      dto.cliente.nombre = p.cliente.nombre;
      dto.cliente.estado = p.cliente.estado;
    }

    return dto;
  }

  async existeProyectoPorIdCliente(idCliente: number): Promise<boolean> {
    const existe: boolean = await this.repository.exists({
      where: {
        cliente: { id: idCliente },
        estado: In([
          EstadosProyectosEnum.ACTIVO,
          EstadosProyectosEnum.FINALIZADO,
        ]),
      },
    });
    return existe;
  }
}
