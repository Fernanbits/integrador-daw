import { Component, inject, OnInit, signal, WritableSignal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { MessageService } from "primeng/api";
import { ListTareaDTO } from "./list-tarea-dto";
import { TareasService } from "../../../../../../../backend/src/modules/gestion/services/tarea.service"; // Ajusta según tus alias de rutas
import { HttpClient } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { Template } from "../../../template/template";
import { DialogModule } from "primeng/dialog";
import { GestionTarea } from "../gestion/gestion-tarea";
import { EstadosTareasEnum } from "../estados-tareas-enum";

@Component({
  selector: "app-tareas-listado",
  templateUrl: "./tareas-listado.html",
  styleUrls: ["./tareas-listado.css"],
  imports: [CommonModule, ButtonModule, CardModule, Template, DialogModule, GestionTarea]
})
export class TareasListado implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);

  idProyecto!: number;
  nombreProyecto = signal<string>("Proyecto");

  // lista de tareas de la consultora
  tareas: WritableSignal<ListTareaDTO[]> = signal([]);
  dialogVisible = signal<boolean>(false);
  tareaSeleccionada = signal<ListTareaDTO | null>(null);

  ngOnInit(): void {
    // Obtenemos el ID
    this.idProyecto = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarDetallesProyecto();
    this.cargarTareas();
  }

  cargarDetallesProyecto(): void {
    this.http.get<any>(`/api/v1/proyectos/${this.idProyecto}`).subscribe({
      next: (proy) => this.nombreProyecto.set(proy.nombre),
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el proyecto.' })
    });
  }

  cargarTareas(): void {
    this.http.get<ListTareaDTO[]>(`/api/v1/tareas/proyecto/${this.idProyecto}`).subscribe({
      next: (data) => this.tareas.set(data),
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al sincronizar las tareas.' })
    });
  }

  // Filtrado local por columna del Kanban
  getTareasPorEstado(estado: string): ListTareaDTO[] {
    return this.tareas().filter(t => t.estado === estado);
  }

  // EXPANSIÓN: Cambio de estado inmediato en el tablero con verificación de rol
  actualizarEstadoTarea(tarea: ListTareaDTO, nuevoEstado: EstadosTareasEnum): void {
    const rolUsuarioActual = sessionStorage.getItem("userRole") || "CREATIVO";

    const body = {
      descripcion: tarea.descripcion,
      estado: nuevoEstado,
      userRole: rolUsuarioActual
    };

    this.http.put(`/api/v1/tareas/${tarea.id}`, body).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Tablero Actualizado', detail: `Tarea movida a ${nuevoEstado}` });
        this.cargarTareas();
      },
      error: (err) => {
        const errorMsg = err.error?.message || "No tenés permisos para realizar esta acción.";
        this.messageService.add({ severity: 'error', summary: 'Restricción de Permisos', detail: errorMsg });
      }
    });
  }

  agregarTarea(): void {
    this.tareaSeleccionada.set(null);
    this.dialogVisible.set(true);
  }

  editarTarea(tarea: ListTareaDTO): void {
    this.tareaSeleccionada.set(tarea);
    this.dialogVisible.set(true);
  }
}
