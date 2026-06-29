import { Component, computed, effect, inject, input, InputSignal, model, ModelSignal, output, OutputEmitterRef, Signal, signal, WritableSignal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { DialogModule } from "primeng/dialog";
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from "primeng/api";
import { GestionTareaApiClient } from "./gestion-tarea-api-client";
import { ButtonModule } from "primeng/button";
import { ListTareaDTO } from "../listado/list-tarea-dto";
import { EstadosTareasEnum } from "../estados-tareas-enum";
import { UpdateTareaDto } from "./update-tarea-dto";
import { CreateTareaDTO } from "./create-tarea-dto";
import { finalize } from "rxjs";
import { PrioridadesTareasEnum } from "../prioridades-tareas-enum";

@Component({
    selector: "app-gestion-tarea",
    templateUrl: "./gestion-tarea.html",
    styleUrls: ["./gestion-tarea.css"],
    imports: [DialogModule, InputTextModule, ButtonModule, ReactiveFormsModule]
})
export class GestionTarea {

    visible: ModelSignal<boolean> = model(false);

    tareaSeleccionada: ModelSignal<ListTareaDTO | null> = model<ListTareaDTO | null>(null);
    onSaved: OutputEmitterRef<ListTareaDTO> = output<ListTareaDTO>();

    readonly estados: WritableSignal<string[]> = signal(Object.values(EstadosTareasEnum));
    readonly prioridades: WritableSignal<string[]> = signal(Object.values(PrioridadesTareasEnum));
    readonly guardando = signal(false);

    private readonly messageService: MessageService = inject(MessageService);

    private readonly gestionTareaApiClient = inject(GestionTareaApiClient);

    readonly idProyecto: InputSignal<number | null> = input<number | null>(null);

    header: Signal<string> = computed(() => {
        if (this.tareaSeleccionada()) {
            return "Editar tarea";
        }
        return "Crear tarea";
    });

    readonly form: FormGroup = new FormGroup({
        descripcion: new FormControl("", [Validators.required]),
        prioridad: new FormControl(PrioridadesTareasEnum.MEDIA, [Validators.required]),
        fechaVencimiento: new FormControl(null),
        estado: new FormControl(null)
    });

    constructor() {
        effect(() => {
            if (this.tareaSeleccionada()) {
                this.form.patchValue({
                    descripcion: this.tareaSeleccionada()?.descripcion,
                    prioridad: this.tareaSeleccionada()?.prioridad ?? PrioridadesTareasEnum.MEDIA,
                    fechaVencimiento: this.normalizarFecha(this.tareaSeleccionada()?.fechaVencimiento ?? null),
                    estado: this.tareaSeleccionada()?.estado
                });
            }
            else {
                this.form.reset({
                    descripcion: "",
                    prioridad: PrioridadesTareasEnum.MEDIA,
                    fechaVencimiento: null,
                    estado: null
                });
            }
        });
    }

    cerrarDialog(): void {
        this.tareaSeleccionada.set(null);
        this.form.reset({
            descripcion: "",
            prioridad: PrioridadesTareasEnum.MEDIA,
            fechaVencimiento: null,
            estado: null
        });
        this.visible.set(false);
    }

    guardarTarea(): void {
        if (this.guardando()) {
            return;
        }

        if (!this.form.valid) {
            this.form.markAllAsTouched();
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor, complete todos los campos requeridos.' });
            return;
        }

        const formRawValue = this.form.getRawValue();
        this.guardando.set(true);

        if (this.tareaSeleccionada()) {
            const tareaActual = this.tareaSeleccionada()!;
            const dto: UpdateTareaDto = {
                descripcion: formRawValue.descripcion,
                estado: formRawValue.estado ?? tareaActual.estado,
                prioridad: formRawValue.prioridad ?? tareaActual.prioridad,
                fechaVencimiento: formRawValue.fechaVencimiento || null
            };
            this.gestionTareaApiClient.actualizarTarea(this.idProyecto(), tareaActual.id, dto).pipe(
                finalize(() => this.guardando.set(false))
            ).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Tarea actualizada correctamente.' });
                    this.onSaved.emit({
                        ...tareaActual,
                        descripcion: dto.descripcion,
                        estado: dto.estado,
                        prioridad: dto.prioridad ?? tareaActual.prioridad,
                        fechaVencimiento: dto.fechaVencimiento ?? null
                    });
                    this.cerrarDialog();
                },
                error: (err) => {
                    let detail: string = "";
                    if (err.error.statusCode >= 400 && err.error.statusCode < 500) {
                        detail = err.error.message
                    }
                    else {
                        detail = "Ha ocurrido un error al actualizar la tarea"
                    }
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: detail });
                }
            });
        } else {
            const dto: CreateTareaDTO = {
                descripcion: formRawValue.descripcion,
                prioridad: formRawValue.prioridad,
                fechaVencimiento: formRawValue.fechaVencimiento || null
            };
            this.gestionTareaApiClient.crearTarea(this.idProyecto(), dto).pipe(
                finalize(() => this.guardando.set(false))
            ).subscribe({
                next: (response) => {
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Tarea creada correctamente.' });
                    this.onSaved.emit({
                        id: response.id,
                        descripcion: dto.descripcion,
                        estado: EstadosTareasEnum.PENDIENTE,
                        prioridad: dto.prioridad ?? PrioridadesTareasEnum.MEDIA,
                        fechaVencimiento: dto.fechaVencimiento ?? null
                    });
                    this.cerrarDialog();
                },
                error: (err) => {
                    let detail: string = "";
                    if (err.error.statusCode >= 400 && err.error.statusCode < 500) {
                        detail = err.error.message
                    }
                    else {
                        detail = "Ha ocurrido un error al crear la tarea"
                    }
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: detail });
                }
            });
        }
    }

    private normalizarFecha(fecha: string | null): string | null {
        return fecha ? fecha.slice(0, 10) : null;
    }

    etiquetaPrioridad(prioridad: string): string {
        const etiquetas: Record<string, string> = {
            [PrioridadesTareasEnum.ALTA]: "Alta",
            [PrioridadesTareasEnum.MEDIA]: "Media",
            [PrioridadesTareasEnum.BAJA]: "Baja"
        };

        return etiquetas[prioridad] ?? prioridad;
    }

    etiquetaEstado(estado: string): string {
        const etiquetas: Record<string, string> = {
            [EstadosTareasEnum.PENDIENTE]: "Pendiente",
            [EstadosTareasEnum.EN_PROGRESO]: "En progreso",
            [EstadosTareasEnum.FINALIZADA]: "Finalizada",
            [EstadosTareasEnum.BAJA]: "Baja"
        };

        return etiquetas[estado] ?? estado;
    }

}
