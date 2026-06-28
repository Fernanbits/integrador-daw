import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
  imports: [CommonModule, ButtonModule, Template],
})
export class Dashboard implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);

  dashboard = signal<DashboardDTO | null>(null);
  loading = signal(true);
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
    this.http.get<DashboardDTO>('/api/v1/proyectos/dashboard/resumen').subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el dashboard.',
        });
      },
    });
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
    const riesgos = data.proyectosEnRiesgo
      .map(
        (proyecto) => `
          <tr>
            <td>${this.escape(proyecto.nombre)}</td>
            <td>${this.etiquetaPulso(proyecto.nivel)}</td>
            <td>${proyecto.puntaje}/100</td>
            <td>${proyecto.avance}%</td>
            <td>${this.escape(proyecto.recomendacion)}</td>
          </tr>`,
      )
      .join('');
    const vencimientos = data.proximosVencimientos
      .map(
        (tarea) => `
          <tr>
            <td>${this.escape(tarea.proyecto)}</td>
            <td>${this.escape(tarea.descripcion)}</td>
            <td>${tarea.prioridad}</td>
            <td>${this.fechaCorta(tarea.fechaVencimiento)}</td>
          </tr>`,
      )
      .join('');

    return `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Reporte PULSO</title>
        <style>
          body { color: #111827; font-family: Arial, sans-serif; margin: 32px; }
          h1 { font-size: 28px; margin: 0; text-transform: uppercase; }
          h2 { border-bottom: 1px solid #d1d5db; font-size: 16px; margin-top: 28px; padding-bottom: 8px; }
          .muted { color: #6b7280; margin: 6px 0 22px; }
          .grid { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); }
          .metric { border: 1px solid #d1d5db; padding: 12px; }
          .metric span { color: #6b7280; display: block; font-size: 11px; text-transform: uppercase; }
          .metric strong { display: block; font-size: 24px; margin-top: 6px; }
          table { border-collapse: collapse; font-size: 12px; width: 100%; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; text-transform: uppercase; }
          @media print { button { display: none; } body { margin: 18mm; } }
        </style>
      </head>
      <body>
        <h1>PULSO - Reporte general</h1>
        <p class="muted">Generado el ${fecha}</p>

        <section class="grid">
          <div class="metric"><span>Proyectos</span><strong>${data.totalProyectos}</strong></div>
          <div class="metric"><span>Activos</span><strong>${data.activos}</strong></div>
          <div class="metric"><span>Tareas</span><strong>${data.tareas.total}</strong></div>
          <div class="metric"><span>Avance global</span><strong>${this.avanceGlobal()}%</strong></div>
          <div class="metric"><span>Vencidas</span><strong>${data.tareas.vencidas}</strong></div>
          <div class="metric"><span>Proximas a vencer</span><strong>${data.tareas.proximasAVencer}</strong></div>
          <div class="metric"><span>Prioridad alta</span><strong>${data.tareas.altaPrioridad}</strong></div>
          <div class="metric"><span>Criticos</span><strong>${data.pulso.criticos}</strong></div>
        </section>

        <h2>Proyectos en riesgo</h2>
        <table>
          <thead><tr><th>Proyecto</th><th>Pulso</th><th>Puntaje</th><th>Avance</th><th>Recomendacion</th></tr></thead>
          <tbody>${riesgos || '<tr><td colspan="5">Sin proyectos en riesgo.</td></tr>'}</tbody>
        </table>

        <h2>Proximos vencimientos</h2>
        <table>
          <thead><tr><th>Proyecto</th><th>Tarea</th><th>Prioridad</th><th>Vence</th></tr></thead>
          <tbody>${vencimientos || '<tr><td colspan="4">Sin vencimientos pendientes.</td></tr>'}</tbody>
        </table>
      </body>
      </html>`;
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
