export type TipoBitacoraProyecto = 'PROYECTO' | 'CLIENTE' | 'TAREA' | 'PULSO';
export type ImpactoBitacoraProyecto = 'ALTO' | 'MEDIO' | 'BAJO' | 'NEUTRO';

export interface BitacoraProyectoItemDTO {
    id: string;
    tipo: TipoBitacoraProyecto;
    titulo: string;
    detalle: string;
    fecha: string;
    impacto: ImpactoBitacoraProyecto;
}

export interface BitacoraProyectoDTO {
    proyectoId: number;
    proyecto: string;
    eventos: BitacoraProyectoItemDTO[];
}
