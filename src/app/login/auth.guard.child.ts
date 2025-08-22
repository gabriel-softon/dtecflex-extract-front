import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from "@angular/router";
import { StorageService } from "../shared/service/storage.service";

@Injectable({
    providedIn: 'root'
})
export class AuthGuardChild {
    constructor(
        private router: Router,
        private storageService: StorageService
    ) {

    }

    canActiveChild(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        if(this.storageService.getItem(localStorage.ACCES_TOKEN)) {
            return true
        }

        this.router.navigate(["/entrar"])
        return false
    }
}