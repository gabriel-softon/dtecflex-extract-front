import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TemaComponent } from './tema/tema.component';

const routes: Routes = [
  {
    path: '', component: TemaComponent, children: [
    ]
  }
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AplicacaoRoutingModule { }
