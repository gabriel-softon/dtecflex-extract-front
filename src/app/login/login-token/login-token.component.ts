import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { CommonModule, DOCUMENT } from '@angular/common';
//import { LoginRouting } from '../login.routing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HttpClientModule } from '@angular/common/http';
import { ToastrModule } from 'ngx-toastr';
import { ModalModule } from 'ngx-bootstrap/modal';
import { StorageService } from 'src/app/shared/service/storage.service';
import { LocalStorageVariables } from 'src/app/shared/enums/local-storage-variables.enum';

@Component({
  standalone:true,
  selector: 'app-login-token',
  templateUrl: './login-token.component.html',
  styleUrls: ['./login-token.component.scss'],
  imports:[
    CommonModule,
    //LoginRouting,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    ////TextMaskModule,
    ToastrModule,
    ModalModule
]
})
export class LoginTokenComponent implements OnInit {

  inscricao: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(DOCUMENT) private document: any,
    private storageService: StorageService
  ) { }

  ngOnInit(): void {
    this.inscricao.push(this.route.queryParamMap.subscribe((params: any) => {

      if (params.params.token) {
        const helper = new JwtHelperService();
        try {
          let decod = helper.decodeToken(params.params.token)
          let valorRecebido = decod.sub.user.toLocaleLowerCase()

          this.storageService.setItem(LocalStorageVariables.ACCESS_TOKEN, params.params.token)
          this.storageService.setItem(LocalStorageVariables.USUARIO, valorRecebido)
          this.document.location.href = '/inicio';
        } catch (error) {
          this.router.navigate(['/entrar']);
        }
      }
    }))
  }

  ngOnDestroy() {
    this.inscricao.map(item => {
      item.unsubscribe()
    })
  }
}

