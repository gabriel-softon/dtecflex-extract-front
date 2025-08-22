import { Injectable } from "@angular/core";
import { LocalStorageVariables } from "../enums/local-storage-variables.enum";

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    constructor() {}

    setItem(key: LocalStorageVariables, value: any): void {
        localStorage.setItem(key, value)
    }

    getItem(key: LocalStorageVariables): any {
        return localStorage.getItem(key)
    }

    removeItem(key: LocalStorageVariables): void {
        localStorage.removeItem(key)
    }

    clear(): void {
        localStorage.clear()
    }
}