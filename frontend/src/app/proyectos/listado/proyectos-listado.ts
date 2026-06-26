import { Component, computed, effect, inject, signal, untracked, WritableSignal } from "@angular/core";
import { MessageService } from "primeng/api";
import { ListProyectoDTO } from "./list-proyecto-dto";
import { ProyectosListadoApiClient } from "./proyectos-listado-api-client";
import { TableModule } from 'primeng/table';
import { ButtonModule } from "primeng/button";
import { Template } from "../../template/template";
import { TooltipModule } from 'primeng/tooltip';
import { GestionProyecto } from "../gestion/gestion-proyecto";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { finalize } from "rxjs";
import { Router } from "@angular/router";
import { DialogModule } from "primeng/dialog";
import { BitacoraProyectoDTO, TipoBitacoraProyecto } from "./bitacora-proyecto-dto";

@Component({
  selector: "app-proyectos-listado",
  templateUrl: "./proyectos-listado.html",
  styleUrls: ["./proyectos-listado.css"],
  imports: [TableModule, ButtonModule, Template, TooltipModule, GestionProyecto, FormsModule, CommonModule, DialogModule]
})
export class ProyectosListado {

  private readonly messageService: MessageService = inject(MessageService);
  private readonly proyectosListadoApiClient: ProyectosListadoApiClient = inject(ProyectosListadoApiClient);
  private readonly router: Router = inject(Router);

  proyectos: WritableSignal<ListProyectoDTO[]> = signal([]);
  dialogVisible = signal(false);
  proyectoSeleccionado = signal<ListProyectoDTO | null>(null);
  proyectoPulso = signal<ListProyectoDTO | null>(null);
  pulsoVisible = signal(false);
  proyectoBitacora = signal<ListProyectoDTO | null>(null);
  bitacora = signal<BitacoraProyectoDTO | null>(null);
  bitacoraVisible = signal(false);
  bitacoraLoading = signal(false);
  bitacoraError = signal<string | null>(null);

  searchQuery = signal<string>('');
  estadoFiltro = signal<string>('');
  sortBy = signal<string>('id');
  sortDirection = signal<string>('ASC');

  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  limit = signal<number>(5);
  totalItems = signal<number>(0);
  pageSizeOptions = [5, 10, 20];
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  proyectosActivos = signal<number>(0);
  proyectosFinalizados = signal<number>(0);
  proyectosBaja = signal<number>(0);
  proyectosInternos = signal<number>(0);
  rangoInicio = computed(() =>
    this.totalItems() ? (this.currentPage() - 1) * this.limit() + 1 : 0
  );
  rangoFin = computed(() =>
    Math.min(this.currentPage() * this.limit(), this.totalItems())
  );

  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      if (!this.dialogVisible()) {
        untracked(() => this.refrescarProyectos());
      }
    });
  }

  refrescarProyectos(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.proyectosListadoApiClient.buscarProyectos(
      this.searchQuery(),
      this.estadoFiltro(),
      this.currentPage(),
      this.limit(),
      this.sortBy(),
      this.sortDirection()
    ).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response) => {
        const total = Number(response?.total ?? 0);
        const lastPage = Math.max(Number(response?.lastPage ?? 1), 1);
        const page = Math.min(Math.max(Number(response?.page ?? this.currentPage()), 1), lastPage);

        if (page !== this.currentPage()) {
          this.currentPage.set(page);
        }

        if (total > 0 && response.data.length === 0 && this.currentPage() > lastPage) {
          this.currentPage.set(lastPage);
          this.refrescarProyectos();
          return;
        }

        this.proyectos.set(response.data);
        this.totalItems.set(total);
        this.totalPages.set(lastPage);
        this.proyectosActivos.set(Number(response.resumen?.activos ?? 0));
        this.proyectosFinalizados.set(Number(response.resumen?.finalizados ?? 0));
        this.proyectosBaja.set(Number(response.resumen?.bajas ?? 0));
        this.proyectosInternos.set(Number(response.resumen?.internos ?? 0));
      },
      error: (error) => {
        const detail = error?.error?.message ?? 'No se pudieron cargar los proyectos';
        this.errorMessage.set(detail);
        this.proyectos.set([]);
        this.totalItems.set(0);
        this.totalPages.set(1);
        this.proyectosActivos.set(0);
        this.proyectosFinalizados.set(0);
        this.proyectosBaja.set(0);
        this.proyectosInternos.set(0);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail
        });
      }
    });
  }

  buscarOFiltrar(): void {
    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.currentPage.set(1);
      this.refrescarProyectos();
    }, 300);
  }

  cambiarPagina(nuevaPagina: number): void {
    const pagina = Math.min(Math.max(nuevaPagina, 1), this.totalPages());

    if (pagina === this.currentPage() || this.loading()) {
      return;
    }

    this.currentPage.set(pagina);
    this.refrescarProyectos();
  }

  cambiarLimite(nuevoLimite: string): void {
    const limite = Number(nuevoLimite) || this.pageSizeOptions[0];
    this.limit.set(limite);
    this.currentPage.set(1);
    this.refrescarProyectos();
  }

  cambiarOrdenamiento(): void {
    this.currentPage.set(1);
    this.refrescarProyectos();
  }

  limpiarFiltros(): void {
    this.searchQuery.set('');
    this.estadoFiltro.set('');
    this.sortBy.set('id');
    this.sortDirection.set('ASC');
    this.currentPage.set(1);
    this.refrescarProyectos();
  }

  paginasVisibles(): number[] {
    const total = this.totalPages();
    const actual = this.currentPage();
    const inicio = Math.max(actual - 2, 1);
    const fin = Math.min(inicio + 4, total);
    const primerVisible = Math.max(fin - 4, 1);

    return Array.from(
      { length: fin - primerVisible + 1 },
      (_, index) => primerVisible + index
    );
  }

  crearProyecto(): void {
    this.dialogVisible.set(true);
  }

  editarProyecto(proyecto: ListProyectoDTO): void {
    this.proyectoSeleccionado.set(proyecto);
    this.dialogVisible.set(true);
  }

  gestionarTareas(proyecto: ListProyectoDTO): void {
    void this.router.navigate(['/proyectos', proyecto.id, 'tareas']);
  }

  verPulso(proyecto: ListProyectoDTO): void {
    this.proyectoPulso.set(proyecto);
    this.pulsoVisible.set(true);
  }

  verBitacora(proyecto: ListProyectoDTO): void {
    this.proyectoBitacora.set(proyecto);
    this.bitacora.set(null);
    this.bitacoraError.set(null);
    this.bitacoraVisible.set(true);
    this.bitacoraLoading.set(true);

    this.proyectosListadoApiClient.obtenerBitacora(proyecto.id).pipe(
      finalize(() => this.bitacoraLoading.set(false))
    ).subscribe({
      next: (bitacora) => this.bitacora.set(bitacora),
      error: (error) => {
        const detail = error?.error?.message ?? 'No se pudo cargar la bitácora';
        this.bitacoraError.set(detail);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail
        });
      }
    });
  }

  etiquetaPulso(nivel: string): string {
    const etiquetas: Record<string, string> = {
      ESTABLE: 'Estable',
      ATENCION: 'Atención',
      CRITICO: 'Crítico',
      SIN_DATOS: 'Sin datos',
      CERRADO: 'Cerrado',
      PAUSADO: 'Pausado',
    };

    return etiquetas[nivel] ?? nivel;
  }

  exportarCsv(): void {
    if (!this.proyectos().length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay proyectos visibles para exportar'
      });
      return;
    }

    const filas = this.proyectos().map((proyecto) => [
      proyecto.id,
      proyecto.nombre,
      proyecto.estado,
      proyecto.cliente?.nombre ?? 'Desarrollo Interno'
    ]);
    const csv = [
      ['ID', 'Nombre', 'Estado', 'Cliente'],
      ...filas
    ].map((fila) => fila.map((valor) => this.valorCsv(valor)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'proyectos.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  iconoBitacora(tipo: TipoBitacoraProyecto): string {
    const iconos: Record<TipoBitacoraProyecto, string> = {
      PROYECTO: 'pi pi-folder',
      CLIENTE: 'pi pi-briefcase',
      TAREA: 'pi pi-check-square',
      PULSO: 'pi pi-chart-line',
    };

    return iconos[tipo];
  }

  etiquetaTipoBitacora(tipo: TipoBitacoraProyecto): string {
    const etiquetas: Record<TipoBitacoraProyecto, string> = {
      PROYECTO: 'Proyecto',
      CLIENTE: 'Cliente',
      TAREA: 'Tarea',
      PULSO: 'Pulso',
    };

    return etiquetas[tipo];
  }

  private valorCsv(valor: unknown): string {
    const texto = String(valor ?? '').replace(/"/g, '""');
    return `"${texto}"`;
  }
}
