import { NgModule } from "@angular/core";
import { CURRENCY_MASK_CONFIG } from "ng2-currency-mask";
import { CustomCurrencyMaskConfig } from "../app.module";

@NgModule({
  declarations: [],
  imports: [],
  providers: [
    { provide: CURRENCY_MASK_CONFIG, useValue: CustomCurrencyMaskConfig },
  ],
})
export class AplicacaoModule {}
