//import { HistoricoAcessoService } from './aplicacao/services/historico-acesso.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {  RouterOutlet } from '@angular/router';

@Component({
  standalone:true,
  selector: "app-root",
  templateUrl: "./app.component.html",
  imports:[
    RouterOutlet
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  inscricao: Subscription[] = [];

  constructor() { }

  ngOnInit(
  ) {  
    window.addEventListener('message', function(event){
      console.log('th clear 1')
      // this.sessionStorage.clear()
      if(event.data.longitude){
        this.sessionStorage.setItem('longitude',event.data.longitude)
      }
      if(event.data.latitude){

        this.sessionStorage.setItem('latitude',event.data.latitude)
      }
      window.removeEventListener('message',()=>{});
    });
  
  }

  ngOnDestroy() {
    this.inscricao.map(item => {
      item.unsubscribe()
    })
  }
}
