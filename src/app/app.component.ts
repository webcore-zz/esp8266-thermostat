import { Component } from "@angular/core";
import { TemperatureChartComponent } from "./temperature-chart/temperature-chart.component";
import { TemperatureControllerComponent } from "./temperature-controller/temperature-controller.component";

@Component({
  selector: "wbcr-root",
  standalone: true,
  imports: [TemperatureChartComponent, TemperatureControllerComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  title = "thermostat";
}
