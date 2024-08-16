import { AfterContentInit, Component, inject, ViewChild } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import {
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartOptions,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
} from "chart.js";
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
  public websocket$: Observable<{
    label: string;
    currentTemp: number;
    maxTemp: number;
  }> = this.controlservice.messages$.pipe(
    map((termostat: Thermostat) => {
      const d = new Date();
      let hour = d.getHours();
      let minutes = d.getMinutes();
      return {
        label: `${hour}:${minutes}`,
        currentTemp: Number(termostat.currentTemp.toFixed(2)),
        maxTemp: Number(termostat.maxTemp.toFixed(2)),
      };
    })
  );

  public ngAfterContentInit(): void {
    Chart.register(
      CategoryScale,
      LinearScale,
      LineController,
      PointElement,
      LineElement
    );

    this.websocket$.subscribe((data) => {
      [data].forEach((bla) => {
        this.chart?.data?.labels?.push(bla.label);
        this.chart?.data?.datasets[0]?.data?.push(bla.currentTemp);
        this.chart?.data?.datasets[1]?.data?.push(bla.maxTemp);
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
        borderColor: "blue",
        backgroundColor: "rgba(255,0,0,0.3)",
        borderWidth: 0.4,
        pointBorderWidth: 0,
        pointRadius: 1,
        pointStyle: "crossRot",
      },
      {
        data: [],
        tension: 0,
        borderColor: "red",
        backgroundColor: "rgba(255,0,0,0.3)",
        borderWidth: 0.4,
        pointBorderWidth: 0,
        pointRadius: 1,
        pointStyle: "crossRot",
      },
    ],
  };
  public lineChartOptions: ChartOptions<"line"> = {
    responsive: true,
    layout: {
      padding: 0,
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      y: {
        type: "linear",
        suggestedMin: 26,
        suggestedMax: 30,
        ticks: {
          font: {
            size: 10,
          },
        },
      },
    },
  };
}
