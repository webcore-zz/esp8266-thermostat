import { AfterContentInit, Component, inject, ViewChild } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { ChartConfiguration, ChartOptions } from "chart.js";
import { BaseChartDirective } from "ng2-charts";
import { map, Observable } from "rxjs";
import { ControlService } from "../control.service";
import { Thermostat } from "../thermostat.model";

@Component({
  selector: "wbcr-temperature-chart",
  standalone: true,
  imports: [MatCardModule, BaseChartDirective],
  templateUrl: "./temperature-chart.component.html",
  styleUrl: "temperature-chart.component.scss",
})
export class TemperatureChartComponent implements AfterContentInit {
  private controlservice = inject(ControlService);
  public websocket$: Observable<{ label: string; value: number }> =
    this.controlservice.messages$.pipe(
      map((termostat: Thermostat) => {
        const d = new Date();
        let hour = d.getHours();
        let minutes = d.getMinutes();
        return {
          label: `${hour}:${minutes}`,
          value: Number(termostat.currentTemp.toFixed(2)),
        };
      })
    );

  public ngAfterContentInit(): void {
    this.websocket$.subscribe((data) => {
      this.chart?.data?.labels?.push(data.label);
      this.chart?.data?.datasets?.forEach((dataset) => {
        dataset.data.push(data.value);
      });
      this.chart?.update();
    });
  }
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  public lineChartData: ChartConfiguration<"line">["data"] = {
    labels: [],
    datasets: [
      {
        data: [],
        tension: 0,
        borderColor: "black",
        backgroundColor: "rgba(255,0,0,0.3)",
        borderWidth: 0.7,
      },
    ],
  };
  public lineChartOptions: ChartOptions<"line"> = {
    responsive: true,
  };
}
