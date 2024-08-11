import { AsyncPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatSliderModule } from "@angular/material/slider";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ControlService } from "../control.service";
import { Subject, Observable, debounceTime, filter, switchMap, takeUntil } from "rxjs";
import { SnackbarComponent } from "../snackbar/snackbar.component";
import { Thermostat } from "../thermostat.model";

@Component({
  selector: "wbcr-temperature-controller",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatSliderModule,
    MatCardModule,
    AsyncPipe,
    MatSnackBarModule,
    MatIconModule,
    TemperatureControllerComponent,
  ],
  providers: [ControlService],
  templateUrl: "./temperature-controller.component.html",
  styleUrl:"./temperature-controller.component.scss"
})
export class TemperatureControllerComponent {
  private controlservice = inject(ControlService);
  private snackBar = inject(MatSnackBar);
  private destroy$: Subject<void> = new Subject<void>();
  public websocket$: Observable<Thermostat> = this.controlservice.messages$;
  public formControl: FormControl<number | null> = new FormControl<number>(0, [
    Validators.required,
    Validators.max(40),
    Validators.min(20),
  ]);

  public ngOnInit(): void {
    this.formControl.valueChanges
      .pipe(
        debounceTime(1000),
        filter((_) => !!this.formControl.valid),
        filter((value) => value !== null),
        switchMap((value) => this.controlservice.setMaxTemp(value)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ message }) => {
          this.openSnackBar(message || "", "SUCCESS");
        },
        error: ({ message }) => {
          this.openSnackBar(message || "", "ERROR");
        },
      });

    this.controlservice
      .getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe((thermostat: Thermostat) =>
        this.formControl.setValue(thermostat.maxTemp, { emitEvent: false })
      );
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private openSnackBar(message: string, type: "SUCCESS" | "ERROR") {
    this.snackBar.openFromComponent(SnackbarComponent, {
      data: message,
      panelClass: `mat-${type.toLocaleLowerCase()}`,
      duration: 10000,
    });
  }
}
