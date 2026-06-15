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

@Component({
  selector: "app-gestion-proyecto",
  templateUrl: "./gestion-proyecto.html",
  styleUrls: ["./gestion-proyecto.css"],
  imports: [
    DialogModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    ReactiveFormsModule,
    ClientesListado,
    NgSelectModule
  ]
})
export class GestionProyecto implements OnInit {

  visible: ModelSignal<boolean> = model(false);
  dialogClientesVisible: WritableSignal<boolean> = signal(false);
  proyectoSeleccionado: ModelSignal<ListProyectoDTO | null> = model<ListProyectoDTO | null>(null);

  estados: WritableSignal<string[]> = signal(Object.values(EstadosProyectosEnum));
  clientes: WritableSignal<ListClienteDTO[]> = signal([]);

  private messageService = inject(MessageService);
  private gestionProyectoApiClient = inject(GestionProyectoApiClient);
  private clientesListadoApiClient = inject(ClientesListadoApiClient);

  header: Signal<string> = computed(() =>
    this.proyectoSeleccionado()
      ? "Editar Proyecto"
      : "Crear Proyecto"
  );

  form: FormGroup = new FormGroup({
    nombre: new FormControl("", [Validators.required]),
    cliente: new FormControl(null),
    estado: new FormControl(EstadosProyectosEnum.ACTIVO)
  });

  constructor() {

    effect(() => {
      if (this.proyectoSeleccionado()) {
        this.form.patchValue({
          nombre: this.proyectoSeleccionado()?.nombre,
          cliente: this.proyectoSeleccionado()?.cliente || null,
          estado: this.proyectoSeleccionado()?.estado
        });
      } else {
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
    this.clientesListadoApiClient
      .buscarClientes(EstadosClientesEnum.ACTIVO)
      .subscribe({
        next: (data) => {


          this.clientes.set(data);


        },
        error: (err) => {
          console.error('ERROR CLIENTES:', err);

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar clientes'
          });
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
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Complete los campos obligatorios'
      });
      return;
    }

    const value = this.form.getRawValue();

    if (this.proyectoSeleccionado()) {

      const dto: UpdateProyectoDto = {
        nombre: value.nombre,
        idCliente: value.cliente ? value.cliente.id : null,
        estado: value.estado
      };

      this.gestionProyectoApiClient.actualizarProyecto(this.proyectoSeleccionado()!.id, dto)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'OK',
              detail: 'Proyecto actualizado'
            });
            this.cerrarDialog();
          }
        });

    } else {

      const dto: CreateProyectoDTO = {
        nombre: value.nombre,
        idCliente: value.cliente ? value.cliente.id : null
      };

      this.gestionProyectoApiClient.crearProyecto(dto)
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'OK',
              detail: 'Proyecto creado'
            });
            this.cerrarDialog();
          }
        });
    }
  }

  gestionarClientes(): void {
    this.dialogClientesVisible.set(true);
  }
}
