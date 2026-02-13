import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SicoAnlage,
  ProductType,
  LicenseRequest,
  LicenseResponse,
  DeleteRequest,
  DeleteResponse
} from '../models/sico-anlage.model';

@Injectable({
  providedIn: 'root'
})
export class LicenseService {
  private readonly apiUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getProjects(product: ProductType, userName: string): Observable<SicoAnlage[]> {
    const params = new HttpParams().set('userName', userName);
    return this.http.get<SicoAnlage[]>(`${this.apiUrl}/api/projects/${product}`, { params });
  }

  createLicense(product: ProductType, request: LicenseRequest): Observable<LicenseResponse> {
    return this.http.post<LicenseResponse>(`${this.apiUrl}/api/licenses/${product}`, request);
  }

  deleteLicense(product: ProductType, request: DeleteRequest): Observable<DeleteResponse> {
    return this.http.post<DeleteResponse>(`${this.apiUrl}/api/licenses/${product}/delete`, request);
  }
}
