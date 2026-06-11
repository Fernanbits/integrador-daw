import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { LoginApiClient } from './login-api-client';
import { MessageService } from 'primeng/api';
import { AuthStore } from '../auth-store';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [ButtonModule, InputTextModule, PasswordModule, ReactiveFormsModule],
})
export class Login {
  private readonly loginApiClient: LoginApiClient = inject(LoginApiClient);
  private readonly messageService: MessageService = inject(MessageService);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly router: Router = inject(Router);

  readonly form: FormGroup = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    clave: new FormControl('', [Validators.required]),
  });

  iniciarSesion() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Por favor, completa tu usuario y clave.',
      });
      return;
    }

    const nombre: string = this.form.value.nombre!;
    const clave: string = this.form.value.clave!;

    this.loginApiClient.iniciarSesion(nombre, clave).subscribe({
      next: (data) => {
        this.authStore.guardarToken(data.accessToken);
        this.router.navigateByUrl('/proyectos');
      },
      error: (err) => {
        // Captura el mensaje específico del backend si existe
        const errorMessage =
          err.error?.message || 'Ha ocurrido un error al iniciar sesión en el servidor.';
        this.messageService.add({
          severity: 'error',
          summary: 'Acceso Denegado',
          detail: errorMessage,
        });
      },
    });
  }
}
