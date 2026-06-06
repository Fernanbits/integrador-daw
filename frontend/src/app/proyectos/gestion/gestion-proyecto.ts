import { Component, computed, effect, inject, model, ModelSignal, Signal, signal, WritableSignal, OnInit } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { DialogModule } from "primeng/dialog";
import { EstadosProyectosEnum } from "../estados-proyectos-enum";
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ListProyectoDTO } from "../listado/list-proyecto-dto";
import { MessageService } from "primeng/api";
import { GestionProyectoApiClient } from "./gestion-proyecto-api-client";
import { CreateProyectoDTO } from "./create-proyecto-dto";
import { ButtonModule } from "primeng/button";
import { UpdateProyectoDto } from "./update-proyecto-dto";
import { ListClienteDTO } from "../clientes/listado/list-cliente-dto";
import { ClientesListadoApiClient } from "../clientes/listado/clientes-listado-api-client";
import { ClientesListado } from "../clientes/listado/clientes-listado";
import { EstadosClientesEnum } from "../clientes/estados-clientes-enum";
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthStore } from "../../auth/auth-store";

@Component({
    selector: "app-gestion-proyecto",
    templateUrl: "./gestion-proyecto.html",
    styleUrls: ["./gestion-proyecto.css"],
    imports: [DialogModule, InputTextModule, SelectModule, ButtonModule, ReactiveFormsModule, ClientesListado, NgSelectModule]
})
export class GestionProyecto implements OnInit {
    visible: ModelSignal<boolean> = model(false);
    readonly dialogClientesVisible: WritableSignal<boolean> = signal<boolean>(false);
    proyectoSeleccionado: ModelSignal<ListProyectoDTO | null> = model<ListProyectoDTO | null>(null);

    readonly estados: WritableSignal<string[]> = signal(Object.values(EstadosProyectosEnum));
    readonly clientes: WritableSignal<ListClienteDTO[]> = signal<ListClienteDTO[]>([]);

    private readonly messageService: MessageService = inject(MessageService);
    private readonly gestionProyectoApiClient = inject(GestionProyectoApiClient);
    private readonly clientesListadoApiClient: ClientesListadoApiClient = inject(ClientesListadoApiClient);
    private readonly authStore: AuthStore = inject(AuthStore);

    header: Signal<string> = computed(() => {
        if (this.proyectoSeleccionado()) {
            return "Editar Proyecto // Estudio Fluido Digital";
        }
        return "Crear Proyecto // Estudio Fluido Digital";
    });

    readonly form: FormGroup = new FormGroup({
        nombre: new FormControl("", [Validators.required]),
        cliente: new FormControl(null),
        estado: new FormControl(null)
    });

    constructor() {
        effect(() => {
            if (this.proyectoSeleccionado()) {
                this.form.patchValue({
                    nombre: this.proyectoSeleccionado()?.nombre,
                    cliente: this.proyectoSeleccionado()?.cliente || null,
                    estado: this.proyectoSeleccionado()?.estado
                });
            }
            else {
                this.form.reset({
                    nombre: "",
                    cliente: null,
                    estado: EstadosProyectosEnum.ACTIVO
                });
            }
        });

        effect(() => {
            if (!this.dialogClientesVisible()) {
                this.refrescarClientes();
            }
        });
    }

    ngOnInit(): void {
        this.refrescarClientes();
    }

    refrescarClientes(): void {
        this.clientesListadoApiClient.buscarClientes(EstadosClientesEnum.ACTIVO).subscribe({
            next: (data) => {
                this.clientes.set(data);
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al obtener los clientes activos.' });
            }
        });
    }

    cerrarDialog(): void {
        this.proyectoSeleccionado.set(null);
        this.visible.set(false);
    }

    guardarProyecto(): void {
        if (!this.form.valid) {
            this.form.markAllAsTouched();
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Por favor, complete todos los campos requeridos.' });
            return;
        }

        const formRawValue = this.form.getRawValue();
        const rolUsuarioActual = sessionStorage.getItem("userRole") || "CREATIVO";

        if (this.proyectoSeleccionado()) {
            const dto: UpdateProyectoDto & { userRole: string } = {
                nombre: formRawValue.nombre,
                idCliente: formRawValue.cliente ? formRawValue.cliente.id : null,
                estado: formRawValue.estado,
                userRole: rolUsuarioActual
            };

            this.gestionProyectoApiClient.actualizarProyecto(this.proyectoSeleccionado()?.id!, dto).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Proyecto actualizado correctamente en ControlFluido.' });
                    this.cerrarDialog();
                },
                error: (err) => {
                    let detail = err.error?.message || "Ha ocurrido un error al actualizar el proyecto.";
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: detail });
                }
            });
        } else {
            const dto: CreateProyectoDTO = {
                nombre: formRawValue.nombre,
                idCliente: formRawValue.cliente ? formRawValue.cliente.id : null
            };

            this.gestionProyectoApiClient.crearProyecto(dto).subscribe({
                next: () => {
                    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Proyecto creado correctamente.' });
                    this.cerrarDialog();
                },
                error: (err) => {
                    let detail = err.error?.message || "Ha ocurrido un error al crear el proyecto.";
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: detail });
                }
            });
        }
    }

    gestionarClientes(): void {
        this.dialogClientesVisible.set(true);
    }
}
