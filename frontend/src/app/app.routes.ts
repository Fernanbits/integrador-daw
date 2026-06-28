import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { TareasListado } from './proyectos/tareas/listado/tareas-listado';
import { ProyectosListado } from './proyectos/listado/proyectos-listado';
import { Dashboard } from './dashboard/dashboard';

export const routes: Routes = [
    {
        path: "login",
        component: Login
    },
    {
        path: 'dashboard',
        component: Dashboard
    },
    {
        path: 'proyectos/:id/tareas',
        component: TareasListado
    },
    {
        path: 'proyectos',
        component: ProyectosListado
    },
    {
        path: "**",
        redirectTo: "login"
    }
];
