import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {

  private apiUrl = '/api/proyectos';

  constructor(private http: HttpClient) {}

  getProyectos(filtro?: { nombre?: string; estado?: string }): Observable<any> {
    let params = new HttpParams();

    if (filtro?.nombre) {
      params = params.set('nombre', filtro.nombre);
    }

    if (filtro?.estado && filtro.estado !== 'TODOS') {
      params = params.set('estado', filtro.estado);
    }

    return this.http.get(this.apiUrl, { params });
  }
}
