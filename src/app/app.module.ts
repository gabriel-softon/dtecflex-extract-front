import { registerLocaleData } from "@angular/common";
import localePt from "@angular/common/locales/pt";
import { CurrencyMaskConfig } from "ng2-currency-mask";

registerLocaleData(localePt);

export const CustomCurrencyMaskConfig: CurrencyMaskConfig = {
  align: "right",
  allowNegative: false,
  decimal: ",",
  precision: 2,
  prefix: "R$ ",
  suffix: "",
  thousands: ".",
};
