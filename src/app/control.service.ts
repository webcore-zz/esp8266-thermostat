import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, merge, Observable } from "rxjs";
import { webSocket } from "rxjs/webSocket";
import { Thermostat } from "./thermostat.model";

@Injectable({
  providedIn: "root",
})
export class ControlService {
  private http = inject(HttpClient);
  //private socket$ = webSocket(`ws://${window.location.hostname}/ws`);
  private socket$ = webSocket(`ws://192.168.50.59/ws`);

  public messages$: Observable<Thermostat> = merge(
    this.socket$.asObservable() as Observable<Thermostat>,
    this.getData()
  ).pipe(
    map((data) => {
      data.currentTemp = Number(data.currentTemp.toFixed(2));
      return data;
    })
  );

  public sendMessage(msg: any) {
    this.socket$.next(msg);
  }

  public setMaxTemp(maxTemp: number): Observable<Thermostat> {
    const formdata = new FormData();
    formdata.append("maxTemp", maxTemp.toString());
    return this.http.post<Thermostat>("/api/data", formdata);
  }

  public getData(): Observable<Thermostat> {
    return this.http.get<Thermostat>("/api/data");
  }
}
