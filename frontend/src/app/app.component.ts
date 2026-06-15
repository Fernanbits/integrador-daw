import { Component, OnInit } from '@angular/core';
import { ClientesService } from '../services/clientes.service';

@Component({
  selector: 'app-root',
  template: `
    <h1>Clientes</h1>
    <ul>
      @for (c of clientes; track c) {
      <li>
        {{ c.nombre }} - {{ c.estado }}
      </li>
      }
    </ul>
  `
})
export class AppComponent implements OnInit {

  clientes: any[] = [];

  constructor(private clientesService: ClientesService) {}

  ngOnInit() {
    this.clientesService.getClientes().subscribe((data: any) => {
      this.clientes = data;
    });
  }
}
