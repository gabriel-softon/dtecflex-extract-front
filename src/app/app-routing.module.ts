// import { NgModule } from '@angular/core';
// import { RouterModule, Routes } from '@angular/router';
// import { HomeComponent } from './home/home.component';

import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AuthGuardChild } from "./login/auth.guard.child";

// export const routes: Routes = [
//   { path: '', component: HomeComponent },
// ];

// @NgModule({
//   imports: [RouterModule.forRoot(routes)],
//   exports: [RouterModule]
// })
// export class AppRoutingModule { }

const routes: Routes = [
  { path: "", redirectTo: "/inicio", pathMatch: "full" },
  {
    path: "",
    loadChildren: () =>
      import("./aplicacao/aplicacao-routing.module").then((m) => m.AplicacaoRoutingModule),
    canActivateChild: [AuthGuardChild]
  },
  // { path: "", compo }
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule {}