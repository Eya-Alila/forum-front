import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { CategoryFilterService } from './services/category-filter.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  isLoggedIn = false;

  constructor(
    private auth: AuthService,
    private categoryFilter: CategoryFilterService
  ) {}

  ngOnInit(): void {
    this.auth.user$.subscribe(u => {
      this.isLoggedIn = !!u;
    });
  }

  onCategorySelected(categoryId: number | null): void {
    this.categoryFilter.setCategory(categoryId);
  }
}