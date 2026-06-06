import { Component, effect, inject, OnInit, signal, WritableSignal } from "@angular/core";
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

@Component({
  selector: "app-proyectos-listado",
  templateUrl: "./proyectos-listado.html",
  styleUrls: ["./proyectos-listado.css"],
  imports: [TableModule, ButtonModule, Template, TooltipModule, GestionProyecto, FormsModule, CommonModule]
})
export class ProyectosListado implements OnInit {
  private readonly messageService: MessageService = inject(MessageService);
  private readonly proyectosListadoApiClient: ProyectosListadoApiClient = inject(ProyectosListadoApiClient);

  proyectos: WritableSignal<ListProyectoDTO[]> = signal([]);
  dialogVisible: WritableSignal<boolean> = signal(false);
  proyectoSeleccionado: WritableSignal<ListProyectoDTO | null> = signal<ListProyectoDTO | null>(null);

  // Nuevas señales para el control de búsqueda avanzada y paginación
  searchQuery = signal<string>('');
  estadoFiltro = signal<string>('');
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  limit = signal<number>(5);

  constructor() {
    effect(() => {
      if (!this.dialogVisible()) {
        this.refrescarProyectos();
      }
    });
  }

  ngOnInit(): void {
    this.refrescarProyectos();
  }

  refrescarProyectos(): void {
    this.proyectosListadoApiClient.buscarProyectos(
      this.searchQuery(),
      this.estadoFiltro(),
      this.currentPage(),
      this.limit()
    ).subscribe({
      next: (response) => {
        // Adaptado al formato paginado del backend
        this.proyectos.set(response.data || response);
        if (response.lastPage) {
          this.totalPages.set(response.lastPage);
        }
      },
      error: (error) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al obtener los proyectos de ControlFluido' });
      }
    });
  }

  buscarOFiltrar(): void {
    this.currentPage.set(1); // Reiniciar paginación al filtrar
    this.refrescarProyectos();
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPages()) {
      this.currentPage.set(nuevaPagina);
      this.refrescarProyectos();
    }
  }

  crearProyecto(): void {
    this.dialogVisible.set(true);
  }

  editarProyecto(proyecto: ListProyectoDTO): void {
    this.dialogVisible.set(true);
    this.proyectoSeleccionado.set(proyecto);
  }

  gestionarTareas(proyecto: ListProyectoDTO): void {
    window.open(`/proyectos/${proyecto.id}/tareas`, '_blank');
  }
}
