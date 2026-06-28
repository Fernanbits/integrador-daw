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
import {
  BitacoraProyectoDTO,
  BitacoraProyectoItemDTO,
  ImpactoBitacoraProyecto,
  TipoBitacoraProyecto,
} from '../dtos/output/bitacora-proyecto.dto';
import { Tarea } from '../entities/tarea.entity';
import {
  DashboardDTO,
  DashboardProyectoRiesgoDTO,
  DashboardTareaVencimientoDTO,
} from '../dtos/output/dashboard.dto';

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
    @InjectRepository(Tarea)
    private readonly tareasRepository: Repository<Tarea>,
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

  async obtenerDashboard(): Promise<DashboardDTO> {
    const proyectos = await this.repository.find({
      relations: { cliente: true },
      order: { id: 'ASC' },
    });
    const pulsos = await this.obtenerPulsos(proyectos);

    const tareasRaw = await this.tareasRepository
      .createQueryBuilder('tarea')
      .select('COUNT(*) FILTER (WHERE tarea.estado <> :baja)', 'total')
      .addSelect(
        'COUNT(*) FILTER (WHERE tarea.estado = :pendiente)',
        'pendientes',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE tarea.estado = :enProgreso)',
        'enProgreso',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE tarea.estado = :finalizada)',
        'finalizadas',
      )
      .addSelect(
        `COUNT(*) FILTER (
          WHERE tarea.estado NOT IN (:baja, :finalizada)
          AND tarea.fechaVencimiento < CURRENT_DATE
        )`,
        'vencidas',
      )
      .addSelect(
        `COUNT(*) FILTER (
          WHERE tarea.estado NOT IN (:baja, :finalizada)
          AND tarea.fechaVencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        )`,
        'proximasAVencer',
      )
      .addSelect(
        `COUNT(*) FILTER (
          WHERE tarea.estado <> :baja
          AND tarea.prioridad = 'ALTA'
        )`,
        'altaPrioridad',
      )
      .setParameters({
        baja: 'BAJA',
        pendiente: 'PENDIENTE',
        enProgreso: 'EN_PROGRESO',
        finalizada: 'FINALIZADA',
      })
      .getRawOne<Record<string, string>>();

    const proximos = await this.tareasRepository
      .createQueryBuilder('tarea')
      .innerJoinAndSelect('tarea.proyecto', 'proyecto')
      .where('tarea.estado NOT IN (:...estados)', {
        estados: ['BAJA', 'FINALIZADA'],
      })
      .andWhere('tarea.fechaVencimiento IS NOT NULL')
      .orderBy('tarea.fechaVencimiento', 'ASC')
      .addOrderBy('tarea.prioridad', 'ASC')
      .take(8)
      .getMany();

    const pulso = {
      estables: 0,
      atencion: 0,
      criticos: 0,
      sinDatos: 0,
      cerrados: 0,
      pausados: 0,
    };
    const proyectosEnRiesgo: DashboardProyectoRiesgoDTO[] = [];

    for (const proyecto of proyectos) {
      const pulsoProyecto =
        pulsos.get(proyecto.id) ?? this.calcularPulso(proyecto, undefined);

      if (pulsoProyecto.nivel === 'ESTABLE') pulso.estables++;
      if (pulsoProyecto.nivel === 'ATENCION') pulso.atencion++;
      if (pulsoProyecto.nivel === 'CRITICO') pulso.criticos++;
      if (pulsoProyecto.nivel === 'SIN_DATOS') pulso.sinDatos++;
      if (pulsoProyecto.nivel === 'CERRADO') pulso.cerrados++;
      if (pulsoProyecto.nivel === 'PAUSADO') pulso.pausados++;

      if (['CRITICO', 'ATENCION'].includes(pulsoProyecto.nivel)) {
        proyectosEnRiesgo.push({
          id: proyecto.id,
          nombre: proyecto.nombre,
          estado: proyecto.estado,
          nivel: pulsoProyecto.nivel,
          puntaje: pulsoProyecto.puntaje,
          avance: pulsoProyecto.avance,
          recomendacion: pulsoProyecto.recomendacion,
        });
      }
    }

    proyectosEnRiesgo.sort((a, b) => a.puntaje - b.puntaje);

    return {
      totalProyectos: proyectos.length,
      activos: proyectos.filter((p) => p.estado === EstadosProyectosEnum.ACTIVO)
        .length,
      finalizados: proyectos.filter(
        (p) => p.estado === EstadosProyectosEnum.FINALIZADO,
      ).length,
      bajas: proyectos.filter((p) => p.estado === EstadosProyectosEnum.BAJA)
        .length,
      internos: proyectos.filter((p) => !p.cliente).length,
      tareas: {
        total: Number(tareasRaw?.total ?? 0),
        pendientes: Number(tareasRaw?.pendientes ?? 0),
        enProgreso: Number(tareasRaw?.enProgreso ?? 0),
        finalizadas: Number(tareasRaw?.finalizadas ?? 0),
        vencidas: Number(tareasRaw?.vencidas ?? 0),
        proximasAVencer: Number(tareasRaw?.proximasAVencer ?? 0),
        altaPrioridad: Number(tareasRaw?.altaPrioridad ?? 0),
      },
      pulso,
      proyectosEnRiesgo: proyectosEnRiesgo.slice(0, 8),
      proximosVencimientos: proximos.map((tarea) => ({
        id: tarea.id,
        descripcion: tarea.descripcion,
        estado: tarea.estado,
        prioridad: tarea.prioridad,
        fechaVencimiento: tarea.fechaVencimiento!,
        proyectoId: tarea.proyecto.id,
        proyecto: tarea.proyecto.nombre,
      })) as DashboardTareaVencimientoDTO[],
    };
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

  async obtenerBitacoraProyecto(id: number): Promise<BitacoraProyectoDTO> {
    const proyecto: Proyecto | null = await this.repository.findOne({
      where: { id },
      relations: { cliente: true, tareas: true },
    });

    if (!proyecto) {
      throw new BadRequestException('Proyecto no encontrado');
    }

    const pulso =
      (await this.obtenerPulsos([proyecto])).get(proyecto.id) ??
      this.calcularPulso(proyecto, undefined);
    const eventos: BitacoraProyectoItemDTO[] = [];

    eventos.push(
      this.crearEventoBitacora(
        'proyecto-creado',
        'PROYECTO',
        'Proyecto creado',
        `Se inició "${proyecto.nombre}" en estado ${proyecto.estado}.`,
        proyecto.fechaCreacion,
        'MEDIO',
      ),
    );

    eventos.push(
      this.crearEventoBitacora(
        'cliente-actual',
        'CLIENTE',
        proyecto.cliente ? 'Cliente asociado' : 'Proyecto interno',
        proyecto.cliente
          ? `Actualmente está asociado a ${proyecto.cliente.nombre}.`
          : 'No depende de un cliente externo.',
        proyecto.fechaCreacion,
        proyecto.cliente ? 'BAJO' : 'NEUTRO',
      ),
    );

    if (this.fechaCambio(proyecto.fechaCreacion, proyecto.fechaActualizacion)) {
      eventos.push(
        this.crearEventoBitacora(
          'proyecto-actualizado',
          'PROYECTO',
          'Proyecto actualizado',
          `La ficha del proyecto quedó en estado ${proyecto.estado}.`,
          proyecto.fechaActualizacion,
          proyecto.estado === EstadosProyectosEnum.ACTIVO ? 'BAJO' : 'MEDIO',
        ),
      );
    }

    for (const tarea of [...(proyecto.tareas ?? [])].sort((a, b) => a.id - b.id)) {
      eventos.push(
        this.crearEventoBitacora(
          `tarea-${tarea.id}-creada`,
          'TAREA',
          'Tarea incorporada',
          tarea.descripcion,
          tarea.fechaCreacion,
          'BAJO',
        ),
      );

      if (this.fechaCambio(tarea.fechaCreacion, tarea.fechaActualizacion)) {
        eventos.push(
          this.crearEventoBitacora(
            `tarea-${tarea.id}-actualizada`,
            'TAREA',
            'Tarea actualizada',
            `${tarea.descripcion} quedó en estado ${tarea.estado}.`,
            tarea.fechaActualizacion,
            tarea.estado === 'FINALIZADA' ? 'MEDIO' : 'BAJO',
          ),
        );
      }
    }

    eventos.push(
      this.crearEventoBitacora(
        'pulso-actual',
        'PULSO',
        `Pulso actual: ${this.etiquetaPulso(pulso.nivel)}`,
        `${pulso.puntaje}/100 con ${pulso.avance}% de avance. ${pulso.recomendacion}`,
        this.obtenerUltimaActividad(proyecto),
        pulso.nivel === 'CRITICO'
          ? 'ALTO'
          : pulso.nivel === 'ATENCION'
            ? 'MEDIO'
            : 'BAJO',
      ),
    );

    return {
      proyectoId: proyecto.id,
      proyecto: proyecto.nombre,
      eventos: eventos.sort(
        (a, b) => b.fecha.getTime() - a.fecha.getTime(),
      ),
    };
  }

  private crearEventoBitacora(
    id: string,
    tipo: TipoBitacoraProyecto,
    titulo: string,
    detalle: string,
    fecha: Date,
    impacto: ImpactoBitacoraProyecto,
  ): BitacoraProyectoItemDTO {
    return { id, tipo, titulo, detalle, fecha, impacto };
  }

  private fechaCambio(creacion: Date, actualizacion: Date): boolean {
    return actualizacion.getTime() - creacion.getTime() > 1000;
  }

  private obtenerUltimaActividad(proyecto: Proyecto): Date {
    const fechas = [
      proyecto.fechaActualizacion,
      ...(proyecto.tareas ?? []).map((tarea) => tarea.fechaActualizacion),
    ];

    return new Date(Math.max(...fechas.map((fecha) => fecha.getTime())));
  }

  private etiquetaPulso(nivel: NivelPulsoProyecto): string {
    const etiquetas: Record<NivelPulsoProyecto, string> = {
      ESTABLE: 'estable',
      ATENCION: 'atencion',
      CRITICO: 'critico',
      SIN_DATOS: 'sin datos',
      CERRADO: 'cerrado',
      PAUSADO: 'pausado',
    };

    return etiquetas[nivel];
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
