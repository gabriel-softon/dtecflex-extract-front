import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { MdbRippleModule } from 'mdb-angular-ui-kit/ripple';

@Component({
    standalone: true,
    selector: 'app-tema',
    templateUrl: './tema.component.html',
    styleUrls: ['./tema.component.scss'],
    imports: [
        CommonModule,
        RouterLink,
        RouterOutlet,
        RouterLinkActive,
        MdbRippleModule,
    ]
})
export class TemaComponent implements OnInit {
    sidebarOpen = false; // mobile

    constructor(){}

    ngOnInit(): void {
        
    }

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
    }
    closeSidebar() {
        this.sidebarOpen = false;
    }
}