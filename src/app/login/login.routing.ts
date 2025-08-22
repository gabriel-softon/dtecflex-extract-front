
import { Routes } from '@angular/router';
import { LoginComponent } from './login.component';
import { EntrarComponent } from './entrar/entrar.component';
import { LoginTokenComponent } from './login-token/login-token.component';

export const loginRoutes: Routes = [

  {
    path: '', component: LoginComponent, children: [
      { path: 'entrar', component: EntrarComponent },
      { path: 'entrarToken', component: LoginTokenComponent },
    //   { path: 'boasVindas', component: WelcomeMobileComponent },
    //   { path: 'recuperarsenha/:token', component: TrocarSenhaEsquecidaComponent },
    //   { path: 'entrar/loginExterno/:id/:token', component: LoginViaAdmComponent },
    //   { path: 'detalhes-app', component: DetalhesAppComponent },
    //   { path: 'novo-termo-uso', component: NewTermUseComponent }
    ]
  }
];