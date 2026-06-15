import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientesService } from '../services/clientes.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>Clientes</h1>
    <ul>
      <li *ngFor="let c of clientes">
        {{ c.nombre }} - {{ c.estado }}
      </li>
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
