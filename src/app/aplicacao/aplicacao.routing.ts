import { Routes } from "@angular/router";
import { TemaComponent } from "./tema/tema.component";
import { AuthGuard } from "../login/auth.guard";

export const APLICACAO_ROUTING: Routes = [
    {
    path: '', component: TemaComponent, canActivate: [AuthGuard], children: [
        { path: '', redirectTo: '/inicio', pathMatch: 'full' },
        { path: 'inicio', loadChildren: () => import('./home/home.routing').then(m => m.HOME_ROUTING) },
        { path: 'aprovacao',loadChildren: () => import('./aprovacao/aprovacao.routing').then(m => m.APROVACAO_ROUTING) },
        { path: 'publicar',loadChildren: () => import('./publicar/publicar.routing').then(m => m.PUBLICAR_ROUTING) },
        // { path: 'marketing',loadChildren: () => import('./marketing/marketing.routing').then(m => m.MARKETING_ROUTING) },
        // { path: 'financeiro',loadChildren: () => import('./financeiro/financeiro.routing').then(m => m.FINANCEIRO_ROUTING) },
        // { path: 'configuracao', loadChildren: () => import('./configuracao/configuracao.routing').then(m => m.CONFIGURACAO_ROUTING) }, 
        // { path: 'form-configuracao', loadChildren: () => import('./configuracao/form-configuracao/form-configuracao.routing').then(m => m.FORMCONFIGURACAO_ROUTING)},
        // { path: 'mv-point', loadChildren: () => import('./mv-point/mv-point.routing').then(m => m.MVPOINT_ROUTING) },
        ]
    }
]