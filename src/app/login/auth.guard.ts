import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { StorageService } from '../shared/service/storage.service';
import { LocalStorageVariables } from '../shared/enums/local-storage-variables.enum';


@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private storageService: StorageService
    ) { 
    // console.log('AuthGuard')
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if (this.storageService.getItem(LocalStorageVariables.ACCESS_TOKEN)) {
      return true;
    }

    this.router.navigate(['/entrar']);
    return false;
  }
}