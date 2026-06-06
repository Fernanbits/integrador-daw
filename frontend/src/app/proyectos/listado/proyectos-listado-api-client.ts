import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class ProyectosListadoApiClient {
    private readonly httpClient = inject(HttpClient);

    buscarProyectos(search: string = '', estado: string = '', page: number = 1, limit: number = 5): Observable<any> {
        const queryParams = `?search=${search}&estado=${estado}&page=${page}&limit=${limit}`;
        return this.httpClient.get<any>(`/api/v1/proyectos${queryParams}`);
    }
}
