import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Template } from '../template/template';

interface DashboardTareasDTO {
  total: number;
  pendientes: number;
  enProgreso: number;
  finalizadas: number;
  vencidas: number;
  proximasAVencer: number;
  altaPrioridad: number;
}

interface DashboardPulsoDTO {
  estables: number;
  atencion: number;
  criticos: number;
  sinDatos: number;
  cerrados: number;
  pausados: number;
}

interface DashboardProyectoRiesgoDTO {
  id: number;
  nombre: string;
  estado: string;
  nivel: string;
  puntaje: number;
  avance: number;
  recomendacion: string;
}

interface DashboardTareaVencimientoDTO {
  id: number;
  descripcion: string;
  estado: string;
  prioridad: string;
  fechaVencimiento: string;
  proyectoId: number;
  proyecto: string;
}

interface DashboardDTO {
  totalProyectos: number;
  activos: number;
  finalizados: number;
  bajas: number;
  internos: number;
  tareas: DashboardTareasDTO;
  pulso: DashboardPulsoDTO;
  proyectosEnRiesgo: DashboardProyectoRiesgoDTO[];
  proximosVencimientos: DashboardTareaVencimientoDTO[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  imports: [CommonModule, FormsModule, ButtonModule, Template],
})
export class Dashboard implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);

  dashboard = signal<DashboardDTO | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  ultimaActualizacion = signal<Date | null>(null);
  incluirResumenPdf = signal(true);
  incluirRiesgosPdf = signal(true);
  incluirVencimientosPdf = signal(true);
  filtroPulsoPdf = signal('');
  filtroPrioridadPdf = signal('');
  filtroEstadoTareaPdf = signal('');
  readonly nivelesPulso = ['CRITICO', 'ATENCION', 'ESTABLE', 'SIN_DATOS', 'PAUSADO', 'CERRADO'];
  readonly prioridadesTarea = ['ALTA', 'MEDIA', 'BAJA'];
  readonly estadosTarea = ['PENDIENTE', 'EN_PROGRESO', 'FINALIZADA', 'BAJA'];
  avanceGlobal = computed(() => {
    const data = this.dashboard();
    if (!data?.tareas.total) {
      return 0;
    }
    return Math.round((data.tareas.finalizadas / data.tareas.total) * 100);
  });

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.http.get<DashboardDTO>('/api/v1/proyectos/dashboard/resumen').subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.ultimaActualizacion.set(new Date());
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const detail =
          error.status === 401
            ? 'Tu sesión no está activa. Volvé a iniciar sesión para ver el dashboard.'
            : 'No se pudo cargar el dashboard.';

        this.loading.set(false);
        this.dashboard.set(null);
        this.errorMessage.set(detail);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail,
        });
      },
    });
  }

  fechaActualizacion(): string {
    const fecha = this.ultimaActualizacion();

    if (!fecha) {
      return 'Sin sincronizar';
    }

    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(fecha);
  }

  fechaCorta(fecha: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(`${fecha.slice(0, 10)}T00:00:00`));
  }

  etiquetaPulso(nivel: string): string {
    const etiquetas: Record<string, string> = {
      ESTABLE: 'Estable',
      ATENCION: 'Atencion',
      CRITICO: 'Critico',
      SIN_DATOS: 'Sin datos',
      CERRADO: 'Cerrado',
      PAUSADO: 'Pausado',
    };

    return etiquetas[nivel] ?? nivel;
  }

  etiquetaPrioridad(prioridad: string): string {
    const etiquetas: Record<string, string> = {
      ALTA: 'Alta',
      MEDIA: 'Media',
      BAJA: 'Baja',
    };

    return etiquetas[prioridad] ?? prioridad;
  }

  etiquetaEstadoTarea(estado: string): string {
    const etiquetas: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      EN_PROGRESO: 'En progreso',
      FINALIZADA: 'Finalizada',
      BAJA: 'Baja',
    };

    return etiquetas[estado] ?? estado;
  }

  generarReportePdf(): void {
    const data = this.dashboard();
    if (!data) {
      return;
    }

    const ventana = window.open('', '_blank', 'width=960,height=720');
    if (!ventana) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Reporte',
        detail: 'Habilita las ventanas emergentes para generar el PDF.',
      });
      return;
    }

    ventana.document.write(this.htmlReporte(data));
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  private htmlReporte(data: DashboardDTO): string {
    const fecha = new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
    const riesgosFiltrados = this.proyectosRiesgoReporte(data);
    const vencimientosFiltrados = this.vencimientosReporte(data);
    const filtros = this.descripcionFiltrosReporte();
    const riesgos = riesgosFiltrados
      .map(
        (proyecto) => `
          <tr>
            <td><strong>${this.escape(proyecto.nombre)}</strong></td>
            <td><span class="badge pulse-${proyecto.nivel.toLowerCase()}">${this.etiquetaPulso(proyecto.nivel)}</span></td>
            <td><strong>${proyecto.puntaje}</strong><span class="muted-inline">/100</span></td>
            <td>
              <div class="progress"><span style="width: ${proyecto.avance}%"></span></div>
              <small>${proyecto.avance}%</small>
            </td>
            <td>${this.escape(proyecto.recomendacion)}</td>
          </tr>`,
      )
      .join('');
    const vencimientos = vencimientosFiltrados
      .map(
        (tarea) => `
          <tr>
            <td><strong>${this.escape(tarea.proyecto)}</strong></td>
            <td>${this.escape(tarea.descripcion)}</td>
            <td>${this.etiquetaEstadoTarea(tarea.estado)}</td>
            <td><span class="badge priority-${tarea.prioridad.toLowerCase()}">${this.etiquetaPrioridad(tarea.prioridad)}</span></td>
            <td>${this.fechaCorta(tarea.fechaVencimiento)}</td>
          </tr>`,
      )
      .join('');
    const estadoPulso = data.pulso.criticos
      ? 'Requiere atencion'
      : data.pulso.atencion
        ? 'En seguimiento'
        : 'Sin alertas criticas';
    const resumen = this.incluirResumenPdf()
      ? `
            <div class="summary">
              <div class="metric"><span>Proyectos</span><strong>${data.totalProyectos}</strong><small>${data.activos} activos</small></div>
              <div class="metric"><span>Tareas</span><strong>${data.tareas.total}</strong><small>${data.tareas.enProgreso} en progreso</small></div>
              <div class="metric alert"><span>Vencidas</span><strong>${data.tareas.vencidas}</strong><small>${data.tareas.proximasAVencer} próximas</small></div>
              <div class="metric focus"><span>Avance global</span><strong>${this.avanceGlobal()}%</strong><small>${data.tareas.altaPrioridad} de prioridad alta</small></div>
            </div>

            <div class="summary">
              <div class="metric"><span>Estables</span><strong>${data.pulso.estables}</strong><small>pulso saludable</small></div>
              <div class="metric focus"><span>Atención</span><strong>${data.pulso.atencion}</strong><small>requieren seguimiento</small></div>
              <div class="metric alert"><span>Críticos</span><strong>${data.pulso.criticos}</strong><small>intervención prioritaria</small></div>
              <div class="metric"><span>Internos</span><strong>${data.internos}</strong><small>${data.finalizados} finalizados</small></div>
            </div>`
      : '';
    const seccionRiesgos = this.incluirRiesgosPdf()
      ? `
            <section>
              <div class="section-heading">
                <h2>Proyectos en riesgo</h2>
                <span class="section-label">${riesgosFiltrados.length} detectados</span>
              </div>
              <table>
                <thead><tr><th>Proyecto</th><th>Pulso</th><th>Puntaje</th><th>Avance</th><th>Recomendacion</th></tr></thead>
                <tbody>${riesgos || '<tr><td colspan="5">Sin proyectos para los filtros seleccionados.</td></tr>'}</tbody>
              </table>
            </section>`
      : '';
    const seccionVencimientos = this.incluirVencimientosPdf()
      ? `
            <section>
              <div class="section-heading">
                <h2>Próximos vencimientos</h2>
                <span class="section-label">${vencimientosFiltrados.length} tareas</span>
              </div>
              <table>
                <thead><tr><th>Proyecto</th><th>Tarea</th><th>Estado</th><th>Prioridad</th><th>Vence</th></tr></thead>
                <tbody>${vencimientos || '<tr><td colspan="5">Sin vencimientos para los filtros seleccionados.</td></tr>'}</tbody>
              </table>
            </section>`
      : '';

    return `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Reporte PULSO</title>
        <style>
          :root {
            --ink: #111413;
            --paper: #f2efe7;
            --muted: #69736e;
            --line: #d9ded8;
            --coral: #ff5138;
            --cyan: #26bfd1;
            --acid: #d7ef4a;
            --success: #43c486;
            --danger: #ef4444;
          }
          * { box-sizing: border-box; }
          body {
            background: #f6f5f0;
            color: var(--ink);
            font-family: Arial, "Segoe UI", sans-serif;
            margin: 0;
            padding: 28px;
          }
          .page {
            background: #fffdf7;
            border: 1px solid var(--line);
            margin: 0 auto;
            max-width: 980px;
            min-height: calc(100vh - 56px);
          }
          .hero {
            background: var(--ink);
            color: var(--paper);
            display: grid;
            gap: 20px;
            grid-template-columns: 1fr auto;
            padding: 28px 32px;
            position: relative;
          }
          .hero::before {
            background: linear-gradient(90deg, var(--coral), var(--cyan), var(--acid));
            content: "";
            height: 5px;
            left: 0;
            position: absolute;
            right: 0;
            top: 0;
          }
          .brand {
            align-items: center;
            display: flex;
            gap: 12px;
            margin-bottom: 18px;
          }
          .brand-mark {
            background: var(--coral);
            box-shadow: 14px 0 0 var(--cyan), 28px 0 0 var(--acid);
            display: inline-block;
            height: 8px;
            width: 8px;
          }
          .brand-name {
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0;
            text-transform: uppercase;
          }
          h1 {
            font-size: 34px;
            line-height: 0.95;
            margin: 0;
            text-transform: uppercase;
          }
          .hero p,
          .stamp span,
          .muted {
            color: #b8c0bb;
          }
          .hero p {
            margin: 8px 0 0;
          }
          .stamp {
            border: 1px solid rgba(242, 239, 231, 0.22);
            min-width: 170px;
            padding: 14px;
          }
          .stamp span,
          .metric span,
          th,
          .section-label {
            display: block;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0;
            text-transform: uppercase;
          }
          .stamp strong {
            display: block;
            font-size: 18px;
            margin-top: 8px;
          }
          .content {
            padding: 24px 32px 32px;
          }
          .scope {
            border: 1px solid var(--line);
            color: var(--muted);
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 18px;
            padding: 10px 12px;
          }
          .scope strong {
            color: var(--ink);
            font-size: 11px;
            text-transform: uppercase;
          }
          .scope span {
            font-size: 11px;
          }
          .summary {
            align-items: stretch;
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(4, 1fr);
            margin-bottom: 24px;
          }
          .metric {
            border: 1px solid var(--line);
            min-height: 92px;
            padding: 14px;
            position: relative;
          }
          .metric::before {
            background: var(--cyan);
            content: "";
            height: 4px;
            left: 14px;
            position: absolute;
            top: -2px;
            width: 28px;
          }
          .metric.alert::before { background: var(--danger); }
          .metric.focus::before { background: var(--acid); }
          .metric span { color: var(--muted); }
          .metric strong {
            display: block;
            font-size: 28px;
            margin-top: 10px;
          }
          .metric small {
            color: var(--muted);
            display: block;
            margin-top: 4px;
          }
          .section-heading {
            align-items: end;
            border-bottom: 1px solid var(--line);
            display: flex;
            justify-content: space-between;
            margin: 26px 0 10px;
            padding-bottom: 8px;
          }
          h2 {
            font-size: 17px;
            margin: 0;
            text-transform: uppercase;
          }
          table {
            border-collapse: collapse;
            font-size: 12px;
            width: 100%;
          }
          th,
          td {
            border-bottom: 1px solid #e6e2d8;
            padding: 10px 8px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #efede5;
            color: #59615d;
          }
          tr:nth-child(even) td {
            background: #faf8f1;
          }
          .badge {
            border: 1px solid var(--line);
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            padding: 4px 7px;
            text-transform: uppercase;
          }
          .pulse-critico,
          .priority-alta {
            border-color: rgba(239, 68, 68, 0.5);
            color: #991b1b;
          }
          .pulse-atencion,
          .priority-media {
            border-color: rgba(245, 158, 11, 0.55);
            color: #92400e;
          }
          .pulse-estable,
          .priority-baja {
            border-color: rgba(67, 196, 134, 0.55);
            color: #166534;
          }
          .progress {
            background: #ece8dc;
            height: 7px;
            margin-bottom: 4px;
            overflow: hidden;
            width: 90px;
          }
          .progress span {
            background: linear-gradient(90deg, var(--coral), var(--cyan));
            display: block;
            height: 100%;
          }
          .muted-inline {
            color: var(--muted);
            font-size: 10px;
            margin-left: 2px;
          }
          .footer {
            border-top: 1px solid var(--line);
            color: var(--muted);
            display: flex;
            font-size: 11px;
            justify-content: space-between;
            margin-top: 28px;
            padding-top: 12px;
          }
          @media print {
            body { background: #fff; padding: 0; }
            .page { border: 0; min-height: auto; }
            .hero { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .metric, th, tr:nth-child(even) td { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="hero">
            <div>
              <div class="brand">
                <span class="brand-mark" aria-hidden="true"></span>
                <span class="brand-name">PULSO · Grupo AM</span>
              </div>
              <h1>Reporte general</h1>
              <p>Estado del portfolio, tareas y vencimientos próximos.</p>
            </div>
            <aside class="stamp">
              <span>Generado</span>
              <strong>${fecha}</strong>
              <span>${estadoPulso}</span>
            </aside>
          </section>

          <section class="content">
            <div class="scope">
              <strong>Alcance del reporte</strong>
              ${filtros.map((filtro) => `<span>${this.escape(filtro)}</span>`).join('')}
            </div>

            ${resumen}
            ${seccionRiesgos}
            ${seccionVencimientos}

            <footer class="footer">
              <span>PULSO · Gestión de proyectos</span>
              <span>Reporte generado desde el dashboard</span>
            </footer>
          </section>
        </main>
      </body>
      </html>`;
  }

  private proyectosRiesgoReporte(data: DashboardDTO): DashboardProyectoRiesgoDTO[] {
    const pulso = this.filtroPulsoPdf();

    return data.proyectosEnRiesgo.filter((proyecto) => !pulso || proyecto.nivel === pulso);
  }

  private vencimientosReporte(data: DashboardDTO): DashboardTareaVencimientoDTO[] {
    const prioridad = this.filtroPrioridadPdf();
    const estado = this.filtroEstadoTareaPdf();

    return data.proximosVencimientos.filter(
      (tarea) => (!prioridad || tarea.prioridad === prioridad) && (!estado || tarea.estado === estado),
    );
  }

  private descripcionFiltrosReporte(): string[] {
    const secciones = [
      this.incluirResumenPdf() ? 'Resumen ejecutivo' : null,
      this.incluirRiesgosPdf() ? 'Proyectos en riesgo' : null,
      this.incluirVencimientosPdf() ? 'Vencimientos' : null,
    ].filter(Boolean) as string[];
    const filtros = [
      this.filtroPulsoPdf() ? `Pulso: ${this.etiquetaPulso(this.filtroPulsoPdf())}` : null,
      this.filtroPrioridadPdf() ? `Prioridad: ${this.etiquetaPrioridad(this.filtroPrioridadPdf())}` : null,
      this.filtroEstadoTareaPdf() ? `Estado tarea: ${this.etiquetaEstadoTarea(this.filtroEstadoTareaPdf())}` : null,
    ].filter(Boolean) as string[];

    return [`Secciones: ${secciones.join(', ') || 'sin secciones'}`, ...filtros];
  }

  private escape(valor: string): string {
    return valor
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
