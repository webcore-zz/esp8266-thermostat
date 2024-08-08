import { Component, inject, Input } from "@angular/core";
import { MAT_SNACK_BAR_DATA } from "@angular/material/snack-bar";

@Component({
  selector: "wbcr-snackbar",
  standalone: true,
  imports: [],
  template: `
    <p>
      {{ message }}
    </p>
  `,
  styles: ``,
})
export class SnackbarComponent {
  public message = inject(MAT_SNACK_BAR_DATA);
}
