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
import {
  NivelPulsoProyecto,
  PulsoProyectoDTO,
} from '../dtos/output/pulso-proyecto.dto';

type PulsoProyectoRaw = {
  id: string;
  totalTareas: string;
  pendientes: string;
  enProgreso: string;
  finalizadas: string;
  ultimaActividad: string | null;
};

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
    const pulsos = await this.obtenerPulsos(proyectos);

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
      dto.pulso = pulsos.get(p.id) ?? this.calcularPulso(p, undefined);
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

  private async obtenerPulsos(
    proyectos: Proyecto[],
  ): Promise<Map<number, PulsoProyectoDTO>> {
    if (!proyectos.length) {
      return new Map();
    }

    const filas = await this.repository
      .createQueryBuilder('proyecto')
      .leftJoin('proyecto.tareas', 'tarea')
      .select('proyecto.id', 'id')
      .addSelect(
        'COUNT(tarea.id) FILTER (WHERE tarea.estado <> :estadoBaja)',
        'totalTareas',
      )
      .addSelect(
        'COUNT(tarea.id) FILTER (WHERE tarea.estado = :estadoPendiente)',
        'pendientes',
      )
      .addSelect(
        'COUNT(tarea.id) FILTER (WHERE tarea.estado = :estadoProgreso)',
        'enProgreso',
      )
      .addSelect(
        'COUNT(tarea.id) FILTER (WHERE tarea.estado = :estadoFinalizada)',
        'finalizadas',
      )
      .addSelect(
        'GREATEST(MAX(tarea.fecha_actualizacion), MAX(proyecto.fecha_actualizacion))',
        'ultimaActividad',
      )
      .where('proyecto.id IN (:...ids)', {
        ids: proyectos.map((proyecto) => proyecto.id),
      })
      .setParameters({
        estadoBaja: 'BAJA',
        estadoPendiente: 'PENDIENTE',
        estadoProgreso: 'EN_PROGRESO',
        estadoFinalizada: 'FINALIZADA',
      })
      .groupBy('proyecto.id')
      .getRawMany<PulsoProyectoRaw>();

    const proyectosPorId = new Map(
      proyectos.map((proyecto) => [proyecto.id, proyecto]),
    );

    return new Map(
      filas.map((fila) => {
        const id = Number(fila.id);
        return [
          id,
          this.calcularPulso(proyectosPorId.get(id)!, fila),
        ];
      }),
    );
  }

  private calcularPulso(
    proyecto: Proyecto,
    fila?: PulsoProyectoRaw,
  ): PulsoProyectoDTO {
    const totalTareas = Number(fila?.totalTareas ?? 0);
    const pendientes = Number(fila?.pendientes ?? 0);
    const enProgreso = Number(fila?.enProgreso ?? 0);
    const finalizadas = Number(fila?.finalizadas ?? 0);
    const avance = totalTareas
      ? Math.round((finalizadas / totalTareas) * 100)
      : 0;
    const ultimaActividad = fila?.ultimaActividad
      ? new Date(fila.ultimaActividad)
      : proyecto.fechaActualizacion;
    const diasSinActividad = Math.max(
      Math.floor((Date.now() - ultimaActividad.getTime()) / 86_400_000),
      0,
    );

    let nivel: NivelPulsoProyecto;
    let puntaje = 0;
    let recomendacion: string;

    if (proyecto.estado === EstadosProyectosEnum.BAJA) {
      nivel = 'PAUSADO';
      recomendacion = 'Proyecto fuera del flujo activo. Revisar antes de reactivarlo.';
    } else if (proyecto.estado === EstadosProyectosEnum.FINALIZADO) {
      nivel = 'CERRADO';
      puntaje = avance;
      recomendacion =
        pendientes + enProgreso > 0
          ? `El proyecto cerró con ${pendientes + enProgreso} tarea(s) sin finalizar.`
          : 'Entrega cerrada y sin trabajo pendiente.';
    } else if (!totalTareas) {
      nivel = 'SIN_DATOS';
      recomendacion = 'Definir la primera tarea para comenzar a medir el avance.';
    } else {
      const aporteAvance = Math.round(avance * 0.35);
      const penalizacionPendientes = Math.round(
        (pendientes / totalTareas) * 20,
      );
      const penalizacionInactividad = Math.round(
        (Math.min(diasSinActividad, 14) / 14) * 30,
      );
      const ajusteFoco = enProgreso > 0 ? 5 : pendientes > 0 ? -5 : 0;
      puntaje = Math.max(
        0,
        Math.min(
          100,
          60 +
            aporteAvance -
            penalizacionPendientes -
            penalizacionInactividad +
            ajusteFoco,
        ),
      );
      nivel = puntaje >= 70 ? 'ESTABLE' : puntaje >= 40 ? 'ATENCION' : 'CRITICO';
      recomendacion = this.recomendarAccion(
        nivel,
        pendientes,
        enProgreso,
        diasSinActividad,
      );
    }

    return {
      nivel,
      puntaje,
      avance,
      totalTareas,
      pendientes,
      enProgreso,
      finalizadas,
      diasSinActividad,
      recomendacion,
    };
  }

  private recomendarAccion(
    nivel: NivelPulsoProyecto,
    pendientes: number,
    enProgreso: number,
    diasSinActividad: number,
  ): string {
    if (nivel === 'CRITICO') {
      return diasSinActividad >= 7
        ? `Reactivar el seguimiento: lleva ${diasSinActividad} días sin movimiento.`
        : 'Reducir el trabajo pendiente y acordar una prioridad inmediata.';
    }

    if (nivel === 'ATENCION') {
      return enProgreso === 0 && pendientes > 0
        ? 'Elegir una tarea pendiente y llevarla a En progreso.'
        : 'Revisar el tablero y cerrar el trabajo que ya está en curso.';
    }

    return 'El ritmo es saludable. Mantener foco y frecuencia de actualización.';
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
