import { PrioridadesTareasEnum } from "../prioridades-tareas-enum";

export interface CreateTareaDTO {
    descripcion: string;
    prioridad?: PrioridadesTareasEnum;
    fechaVencimiento?: string | null;
}
