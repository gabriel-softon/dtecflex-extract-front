import { Component, OnInit } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";

@Component({
    standalone: true,
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    imports: [
        RouterLink,
        RouterOutlet
    ]
})
export class LoginComponent implements OnInit {

    constructor() {}

    ngOnInit(): void {
        
    }
}