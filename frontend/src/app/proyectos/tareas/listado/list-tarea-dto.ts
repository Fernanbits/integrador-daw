import { EstadosTareasEnum } from "../estados-tareas-enum";
import { PrioridadesTareasEnum } from "../prioridades-tareas-enum";

export interface ListTareaDTO{
    id: number;
    descripcion: string;
    estado: EstadosTareasEnum;
    prioridad: PrioridadesTareasEnum;
    fechaVencimiento: string | null;
}
