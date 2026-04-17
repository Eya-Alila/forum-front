import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-category-bar',
  templateUrl: './CategoryBarComponent.html',
  styleUrls: ['./CategoryBarComponent.css']
})
export class CategoryBarComponent implements OnInit {

  @Output() categorySelected = new EventEmitter<number | null>();

  categories: any[] = [];
  selectedCategoryId: number | null = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  getHeaders() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.getToken()}`
      })
    };
  }

  loadCategories(): void {
    this.http.get<any[]>(`${environment.apiUrl}/categories`, this.getHeaders())
      .subscribe({
        next: (res) => this.categories = res || [],
        error: (err) => console.error(err)
      });
  }

  selectCategory(id: number | null) {
    this.selectedCategoryId = id;
    this.categorySelected.emit(id); // 🔥 FIX PROPRE
  }
}