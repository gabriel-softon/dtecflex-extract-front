import { Routes } from "@angular/router";

export const APP_ROUTING: Routes = [
    { path: '', redirectTo: '/inicio', pathMatch: 'full' },
    {
        path: '',
        loadChildren: () => import("./login/login.routing").then((m) => m.loginRoutes)
    },
    {
        path: '',
        loadChildren: () => import("./aplicacao/aplicacao.routing").then((m) => m.APLICACAO_ROUTING)
    },
]