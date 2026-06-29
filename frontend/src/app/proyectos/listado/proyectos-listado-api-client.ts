import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpClient, HttpParams } from "@angular/common/http";
import { ListProyectoDTO } from "./list-proyecto-dto";
import { BitacoraProyectoDTO } from "./bitacora-proyecto-dto";

export interface ProyectosPaginadosResponse {
    data: ListProyectoDTO[];
    total: number;
    page: number;
    limit: number;
    lastPage: number;
    resumen: {
        activos: number;
        finalizados: number;
        bajas: number;
        internos: number;
    };
}

@Injectable({
  providedIn: 'root'
})
export class ProyectosListadoApiClient {
    private readonly httpClient = inject(HttpClient);

    buscarProyectos(
        search: string = '',
        estado: string = '',
        page: number = 1,
        limit: number = 5,
        sortBy: string = 'id',
        sortDirection: string = 'DESC'
    ): Observable<ProyectosPaginadosResponse> {
        let params = new HttpParams()
            .set('page', page)
            .set('limit', limit)
            .set('sortBy', sortBy)
            .set('sortDirection', sortDirection);

        const searchTrimmed = search.trim();
        const estadoTrimmed = estado.trim();

        if (searchTrimmed) {
            params = params.set('search', searchTrimmed);
        }

        if (estadoTrimmed) {
            params = params.set('estado', estadoTrimmed);
        }

        return this.httpClient.get<ProyectosPaginadosResponse>('/api/v1/proyectos', { params });
    }

    obtenerBitacora(idProyecto: number): Observable<BitacoraProyectoDTO> {
        return this.httpClient.get<BitacoraProyectoDTO>(`/api/v1/proyectos/${idProyecto}/bitacora`);
    }
}
