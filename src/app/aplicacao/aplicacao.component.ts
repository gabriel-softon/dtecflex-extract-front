import { RouterOutlet } from '@angular/router';
import { Component, OnInit} from '@angular/core';

@Component({
  standalone:true,
  selector: 'app-aplicacao',
  templateUrl: './aplicacao.component.html',
  imports:[
    RouterOutlet,
]
})
export class AplicacaoComponent implements OnInit {


  constructor() {

  }
  ngOnInit() { }
}