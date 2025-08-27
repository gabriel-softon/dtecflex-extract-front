import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../auth.service';
import { Subscription, take } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { CommonModule } from '@angular/common';
import { JwtHelperService } from '@auth0/angular-jwt';
import { LocalStorageVariables } from 'src/app/shared/enums/local-storage-variables.enum';
import { StorageService } from 'src/app/shared/service/storage.service';

@Component({
  standalone: true,
  selector: 'app-entrar',
  templateUrl: './entrar.component.html',
  styleUrls: ['./entrar.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule
  ],
  providers: [
    BsModalService,
  ],
})
export class EntrarComponent implements OnInit {
  @ViewChild('modalRecuperacaoSenha') modalRecuperacaoSenha!: TemplateRef<any>;
  @ViewChild('modalCadastroUsuario') modalCadastroUsuario!: TemplateRef<any>;

  inscricao: Subscription[] = [];

  loginForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
  });

  modalRef: BsModalRef[] = [];
  spinner = false;
  deviceMobile!: boolean
  imgBanner: any[] = [];
  emProducao = false
  banners = []
  bannersMobile = []
//   linkRedirectDetalhesApp = `${environment.site}detalhes-app`

  constructor(
        private auth: AuthService,
        private router: Router,
        private storageService: StorageService,
    ) {    
  }

  ngOnInit() {
   
 //

  }
  setRoute(rota){
    this.router.navigate(rota)

  }

  auxSubmit() {
    this.spinner = true;
   // this.spinner ? this.submit() : undefined;
  }

  submit() {
    if (this.loginForm.valid) {
      this.spinner = true
      const { value } = this.loginForm

      const objLogin = {
        ...value,
        // system: SystemsEnum.AFILIADO,
      }

      this.auth.login(objLogin.username, objLogin.password).pipe(take(1)).subscribe((result: any) => {

        console.log('result:::',result)


        if (!result.bloqueado) {
          // opcional: limpa tudo antes de salvar, se realmente precisar
          this.storageService.clear();

          // Pega o campo correto, seja camelCase ou snake_case
          const at = result.accessToken ?? result.access_token;
          console.log('→ access token efetivo:', at);

          // Salva na chave que o interceptor lê
          this.storageService.setItem(LocalStorageVariables.ACCESS_TOKEN, at);

          // Confirma no localStorage
          console.log(
            '→ storage agora tem:',
            localStorage.getItem(LocalStorageVariables.ACCESS_TOKEN)
          );

          this.router.navigate(['inicio']);
        }
         else {
          // if (result.usuarioExtra != undefined && result.usuarioExtra == true) {
          //   this.spinner = false
          //   // this.toastr.error('Usuário extra não contratado para esta conta');
          //   this.loginForm.get('password').setValue(null)
          //   this.loginForm.get('password').markAsUntouched()
          // } else {
          //   this.spinner = false
          //   // this.toastr.error('Sua conta expirou. Por favor, entre em contato com o administrador do app');
          //   this.loginForm.get('password').setValue(null)
          //   this.loginForm.get('password').markAsUntouched()
          // }
        }
      }, err => {
        this.spinner = false
        this.loginForm.get('password').setValue(null)
        this.loginForm.get('password').markAsUntouched()
        // this.toastr.error('Credenciais inexistente!');
      });
    } else {
      this.spinner = false
      this.loginForm.get('username').markAsTouched()
      this.loginForm.get('username').markAsTouched()
    }
  }

  decline(): void {
    if (this.modalRef.length > 0) {
      let modal = this.modalRef.pop();
      modal?.hide()
    }
  }

}