import { Component, computed, effect, inject, OnDestroy, signal, untracked, WritableSignal } from "@angular/core";
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
export class ProyectosListado implements OnDestroy {

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
  sortDirection = signal<string>('DESC');

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
  private requestSequence = 0;

  constructor() {
    effect(() => {
      if (!this.dialogVisible()) {
        untracked(() => this.refrescarProyectos());
      }
    });
  }

  refrescarProyectos(): void {
    const requestId = ++this.requestSequence;
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
      finalize(() => {
        if (requestId === this.requestSequence) {
          this.loading.set(false);
        }
      })
    ).subscribe({
      next: (response) => {
        if (requestId !== this.requestSequence) {
          return;
        }

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
        if (requestId !== this.requestSequence) {
          return;
        }

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
    this.sortDirection.set('DESC');
    this.currentPage.set(1);
    this.refrescarProyectos();
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
    this.requestSequence++;
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

  exportarExcel(): void {
    if (!this.proyectos().length) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin datos',
        detail: 'No hay proyectos visibles para exportar'
      });
      return;
    }

    const fecha = new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
    const estadoFiltro = this.estadoFiltro() || 'Todos';
    const busqueda = this.searchQuery().trim() || 'Sin busqueda';
    const filas = this.proyectos()
      .map(
        (proyecto) => `
          <tr>
            <td class="id">P-${proyecto.id}</td>
            <td class="project"><strong>${this.escapeExcel(proyecto.nombre)}</strong></td>
            <td>${this.escapeExcel(proyecto.cliente?.nombre ?? 'Desarrollo interno')}</td>
            <td><span class="status status-${proyecto.estado.toLowerCase()}">${this.escapeExcel(proyecto.estado)}</span></td>
            <td><span class="pulse pulse-${proyecto.pulso.nivel.toLowerCase()}">${this.etiquetaPulso(proyecto.pulso.nivel)}</span></td>
            <td class="number">${proyecto.pulso.puntaje}</td>
            <td class="number">${proyecto.pulso.avance}%</td>
            <td>${this.escapeExcel(proyecto.pulso.recomendacion)}</td>
          </tr>`,
      )
      .join('');
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Proyectos</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          body { font-family: Arial, sans-serif; color: #111413; }
          .brand { background: #111413; color: #f2efe7; font-size: 26px; font-weight: 800; text-transform: uppercase; }
          .brand-small { background: #111413; color: #b8c0bb; font-size: 11px; text-transform: uppercase; }
          .stripe-coral { background: #ff5138; }
          .stripe-cyan { background: #26bfd1; }
          .stripe-acid { background: #d7ef4a; }
          .meta-label { background: #efede5; color: #59615d; font-size: 11px; font-weight: 800; text-transform: uppercase; }
          .meta-value { background: #fffdf7; color: #111413; font-weight: 700; }
          .metric-label { background: #111413; color: #f2efe7; font-size: 11px; font-weight: 800; text-transform: uppercase; }
          .metric-value { background: #fffdf7; border: 1px solid #d9ded8; font-size: 22px; font-weight: 800; }
          th { background: #202522; color: #f2efe7; font-size: 11px; font-weight: 800; text-transform: uppercase; }
          td { border-bottom: 1px solid #e6e2d8; font-size: 12px; vertical-align: top; }
          .id { color: #ff5138; font-weight: 800; }
          .project { min-width: 220px; }
          .number { text-align: right; }
          .status, .pulse { font-weight: 800; text-transform: uppercase; }
          .status-activo, .pulse-estable { color: #166534; }
          .status-finalizado, .pulse-cerrado { color: #087f91; }
          .status-baja, .pulse-pausado { color: #6d7671; }
          .pulse-atencion { color: #92400e; }
          .pulse-critico { color: #991b1b; }
          .pulse-sin_datos { color: #59615d; }
        </style>
      </head>
      <body>
        <table>
          <tr><td class="stripe-coral"></td><td class="stripe-cyan"></td><td class="stripe-acid"></td><td colspan="5"></td></tr>
          <tr><td colspan="8" class="brand">PULSO · Reporte de proyectos</td></tr>
          <tr><td colspan="8" class="brand-small">Gestion de proyectos · Grupo AM · ${this.escapeExcel(fecha)}</td></tr>
          <tr><td colspan="8"></td></tr>
          <tr>
            <td class="meta-label">Busqueda</td><td class="meta-value">${this.escapeExcel(busqueda)}</td>
            <td class="meta-label">Estado</td><td class="meta-value">${this.escapeExcel(estadoFiltro)}</td>
            <td class="meta-label">Pagina</td><td class="meta-value">${this.currentPage()} / ${this.totalPages()}</td>
            <td class="meta-label">Registros</td><td class="meta-value">${this.proyectos().length} de ${this.totalItems()}</td>
          </tr>
          <tr><td colspan="8"></td></tr>
          <tr>
            <td class="metric-label">Activos</td><td class="metric-value">${this.proyectosActivos()}</td>
            <td class="metric-label">Finalizados</td><td class="metric-value">${this.proyectosFinalizados()}</td>
            <td class="metric-label">En baja</td><td class="metric-value">${this.proyectosBaja()}</td>
            <td class="metric-label">Internos</td><td class="metric-value">${this.proyectosInternos()}</td>
          </tr>
          <tr><td colspan="8"></td></tr>
          <tr>
            <th>ID</th>
            <th>Proyecto</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Pulso</th>
            <th>Puntaje</th>
            <th>Avance</th>
            <th>Recomendacion</th>
          </tr>
          ${filas}
        </table>
      </body>
      </html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pulso-proyectos.xls';
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

  private escapeExcel(valor: unknown): string {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
