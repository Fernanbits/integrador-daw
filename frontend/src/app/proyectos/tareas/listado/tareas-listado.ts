import { Component, computed, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ListTareaDTO } from './list-tarea-dto';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Template } from '../../../template/template';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { GestionTarea } from '../gestion/gestion-tarea';
import { EstadosTareasEnum } from '../estados-tareas-enum';
import { FormsModule } from '@angular/forms';
import { PrioridadesTareasEnum } from '../prioridades-tareas-enum';

@Component({
  selector: 'app-tareas-listado',
  templateUrl: './tareas-listado.html',
  styleUrls: ['./tareas-listado.css'],
  imports: [
    CommonModule,
    ButtonModule,
    Template,
    DialogModule,
    TooltipModule,
    GestionTarea,
    FormsModule,
    RouterLink,
  ],
})
export class TareasListado implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);

  idProyecto!: number;
  nombreProyecto = signal<string>('Proyecto');

  tareas: WritableSignal<ListTareaDTO[]> = signal([]);

  dialogVisible = signal<boolean>(false);
  tareaSeleccionada = signal<ListTareaDTO | null>(null);
  filtroTareas = signal<string>('');
  loading = signal<boolean>(true);
  actualizandoTareaId = signal<number | null>(null);
  estadoDestino = signal<EstadosTareasEnum | null>(null);
  tareaArrastradaId = signal<number | null>(null);
  estadoSobreArrastre = signal<EstadosTareasEnum | null>(null);
  tareaRecienMovidaId = signal<number | null>(null);
  private tareaRecienMovidaTimeout: ReturnType<typeof setTimeout> | null = null;
  tareasVisibles = computed(() => {
    const filtro = this.filtroTareas().trim().toLowerCase();
    return this.tareas().filter(
      (tarea) => !filtro || tarea.descripcion.toLowerCase().includes(filtro),
    );
  });
  totalVisibles = computed(() => this.tareasVisibles().length);
  filtroActivo = computed(() => this.filtroTareas().trim().length > 0);
  totalTareas = computed(() => this.tareas().length);
  totalPendientes = computed(() => this.contarTareas(EstadosTareasEnum.PENDIENTE));
  totalEnProgreso = computed(() => this.contarTareas(EstadosTareasEnum.EN_PROGRESO));
  totalFinalizadas = computed(() => this.contarTareas(EstadosTareasEnum.FINALIZADA));
  totalVencidas = computed(() => this.tareas().filter((tarea) => this.estaVencida(tarea)).length);
  totalAltaPrioridad = computed(() =>
    this.tareas().filter((tarea) => tarea.prioridad === PrioridadesTareasEnum.ALTA).length,
  );
  porcentajeFinalizadas = computed(() => {
    const total = this.totalTareas();
    return total ? Math.round((this.totalFinalizadas() / total) * 100) : 0;
  });

  ngOnInit(): void {
    this.idProyecto = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarDetallesProyecto();
    this.cargarTareas();
  }

  ngOnDestroy(): void {
    if (this.tareaRecienMovidaTimeout) {
      clearTimeout(this.tareaRecienMovidaTimeout);
    }
  }

  cargarDetallesProyecto(): void {
    this.http.get<any>(`/api/v1/proyectos/${this.idProyecto}`).subscribe({
      next: (proy) => this.nombreProyecto.set(proy.nombre),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el proyecto.',
        }),
    });
  }

  cargarTareas(): void {
    this.loading.set(true);
    this.http.get<ListTareaDTO[]>(`/api/v1/proyectos/${this.idProyecto}/tareas`).subscribe({
      next: (data) => {
        this.tareas.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al sincronizar las tareas.',
        });
      },
    });
  }

  getTareasPorEstado(estado: string): ListTareaDTO[] {
    return this.tareasVisibles().filter((tarea) => tarea.estado === estado);
  }

  actualizarEstadoTarea(tarea: ListTareaDTO, nuevoEstado: EstadosTareasEnum): void {
    if (this.actualizandoTareaId() !== null || tarea.estado === nuevoEstado) {
      this.finalizarArrastre();
      return;
    }

    this.actualizandoTareaId.set(tarea.id);
    this.estadoDestino.set(nuevoEstado);

    const body = {
      descripcion: tarea.descripcion,
      estado: nuevoEstado,
      prioridad: tarea.prioridad,
      fechaVencimiento: tarea.fechaVencimiento,
    };

    this.http.put(`/api/v1/proyectos/${this.idProyecto}/tareas/${tarea.id}`, body).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Tablero actualizado',
          detail: `Tarea movida a ${this.etiquetaEstado(nuevoEstado)}`,
        });

        this.tareas.update((tareas) =>
          tareas.map((item) => (item.id === tarea.id ? { ...item, estado: nuevoEstado } : item)),
        );
        this.marcarTareaRecienMovida(tarea.id);
        this.actualizandoTareaId.set(null);
        this.estadoDestino.set(null);
        this.finalizarArrastre();
      },
      error: (err) => {
        this.actualizandoTareaId.set(null);
        this.estadoDestino.set(null);
        this.finalizarArrastre();
        const errorMsg = err.error?.message || 'Error al actualizar tarea';

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMsg,
        });
      },
    });
  }

  limpiarFiltro(): void {
    this.filtroTareas.set('');
  }

  iniciarArrastre(event: DragEvent, tarea: ListTareaDTO): void {
    if (this.actualizandoTareaId() !== null) {
      event.preventDefault();
      return;
    }

    this.tareaArrastradaId.set(tarea.id);
    this.estadoSobreArrastre.set(null);
    event.dataTransfer?.setData('text/plain', String(tarea.id));

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  permitirSoltar(event: DragEvent, estado: EstadosTareasEnum): void {
    if (!this.puedeSoltarEnEstado(estado)) {
      return;
    }

    event.preventDefault();
    this.estadoSobreArrastre.set(estado);

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  salirZonaArrastre(event: DragEvent, estado: EstadosTareasEnum): void {
    const columna = event.currentTarget as HTMLElement | null;
    const siguienteElemento = event.relatedTarget as Node | null;

    if (columna?.contains(siguienteElemento)) {
      return;
    }

    if (this.estadoSobreArrastre() === estado) {
      this.estadoSobreArrastre.set(null);
    }
  }

  soltarTarea(event: DragEvent, estado: EstadosTareasEnum): void {
    event.preventDefault();

    const tareaId = this.tareaArrastradaId() ?? Number(event.dataTransfer?.getData('text/plain'));
    const tarea = this.tareas().find((item) => item.id === tareaId);
    this.estadoSobreArrastre.set(null);

    if (!tarea) {
      this.finalizarArrastre();
      return;
    }

    this.actualizarEstadoTarea(tarea, estado);
  }

  finalizarArrastre(): void {
    this.tareaArrastradaId.set(null);
    this.estadoSobreArrastre.set(null);
  }

  estaActualizando(tarea: ListTareaDTO, estado: EstadosTareasEnum): boolean {
    return this.actualizandoTareaId() === tarea.id && this.estadoDestino() === estado;
  }

  estaEnTransito(tarea: ListTareaDTO): boolean {
    return this.actualizandoTareaId() === tarea.id;
  }

  estaArrastrando(tarea: ListTareaDTO): boolean {
    return this.tareaArrastradaId() === tarea.id;
  }

  puedeSoltarEnEstado(estado: EstadosTareasEnum): boolean {
    const tareaId = this.tareaArrastradaId();
    const tarea = this.tareas().find((item) => item.id === tareaId);
    return !!tarea && tarea.estado !== estado && this.actualizandoTareaId() === null;
  }

  esColumnaDestino(estado: EstadosTareasEnum): boolean {
    return this.estadoSobreArrastre() === estado && this.puedeSoltarEnEstado(estado);
  }

  esColumnaOrigen(estado: EstadosTareasEnum): boolean {
    const tareaId = this.tareaArrastradaId();
    const tarea = this.tareas().find((item) => item.id === tareaId);
    return !!tarea && tarea.estado === estado;
  }

  esColumnaActualizando(estado: EstadosTareasEnum): boolean {
    return this.estadoDestino() === estado && this.actualizandoTareaId() !== null;
  }

  estaRecienMovida(tarea: ListTareaDTO): boolean {
    return this.tareaRecienMovidaId() === tarea.id;
  }

  agregarTarea(): void {
    this.tareaSeleccionada.set(null);
    this.dialogVisible.set(true);
  }

  editarTarea(tarea: ListTareaDTO): void {
    this.tareaSeleccionada.set(tarea);
    this.dialogVisible.set(true);
  }

  private contarTareas(estado: EstadosTareasEnum): number {
    return this.tareas().filter((tarea) => tarea.estado === estado).length;
  }

  private marcarTareaRecienMovida(tareaId: number): void {
    if (this.tareaRecienMovidaTimeout) {
      clearTimeout(this.tareaRecienMovidaTimeout);
    }

    this.tareaRecienMovidaId.set(tareaId);
    this.tareaRecienMovidaTimeout = setTimeout(() => {
      this.tareaRecienMovidaId.set(null);
      this.tareaRecienMovidaTimeout = null;
    }, 900);
  }

  etiquetaPrioridad(prioridad: PrioridadesTareasEnum): string {
    const etiquetas: Record<PrioridadesTareasEnum, string> = {
      [PrioridadesTareasEnum.ALTA]: 'Alta',
      [PrioridadesTareasEnum.MEDIA]: 'Media',
      [PrioridadesTareasEnum.BAJA]: 'Baja',
    };

    return etiquetas[prioridad] ?? prioridad;
  }

  fechaCorta(fecha: string | null): string {
    if (!fecha) {
      return 'Sin vencimiento';
    }

    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(new Date(`${fecha.slice(0, 10)}T00:00:00`));
  }

  estaVencida(tarea: ListTareaDTO): boolean {
    if (!tarea.fechaVencimiento || tarea.estado === EstadosTareasEnum.FINALIZADA || tarea.estado === EstadosTareasEnum.BAJA) {
      return false;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(`${tarea.fechaVencimiento.slice(0, 10)}T00:00:00`);
    return vencimiento < hoy;
  }

  private etiquetaEstado(estado: EstadosTareasEnum): string {
    const etiquetas: Record<EstadosTareasEnum, string> = {
      [EstadosTareasEnum.PENDIENTE]: 'pendiente',
      [EstadosTareasEnum.EN_PROGRESO]: 'en progreso',
      [EstadosTareasEnum.FINALIZADA]: 'finalizada',
      [EstadosTareasEnum.BAJA]: 'baja',
    };

    return etiquetas[estado];
  }
}
