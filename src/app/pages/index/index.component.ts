import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css']
})
export class IndexComponent implements OnInit {

  user: any = null;
  posts: any[] = [];
  categories: any[] = [];
  filteredPosts: any[] = [];

  selectedCategory: number | null = null;
  loadingPosts = false;
  currentUserId: number | null = null;

  // ✅ Pagination classique
  currentPage = 1;
  pageSize = 3;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    this.user = storedUser ? JSON.parse(storedUser) : null;
    this.currentUserId = this.user?.id ?? null;

    this.getCategories();
    this.getPosts();
  }

 getPosts(): void {
  this.loadingPosts = true;

  this.http.get<any[]>('http://localhost:8000/api/posts')
    .subscribe({
      next: (res) => {
        this.posts = (res || []).map((post: any) => ({
          ...post,
          showComments: post.showComments ?? false,
          comment: post.comment ?? ''
        }));

        console.log('posts reçus =', this.posts.length);

        this.applyFilter();
        this.loadingPosts = false;
      },
      error: (err) => {
        console.error('Erreur getPosts:', err);
        this.posts = [];
        this.filteredPosts = [];
        this.loadingPosts = false;
      }
    });
}

  getCategories(): void {
    this.http.get<any[]>('http://localhost:8000/api/categories')
      .subscribe({
        next: (res) => this.categories = res || [],
        error: () => this.categories = []
      });
  }

  selectCategory(id: number | null): void {
    this.selectedCategory = id;
    this.currentPage = 1; // ✅ retour à la page 1 après filtre
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.selectedCategory === null) {
      this.filteredPosts = this.posts;
    } else {
      this.filteredPosts = this.posts.filter(
        (post: any) => post.categorie?.id === this.selectedCategory
      );
    }

    // ✅ Si la page actuelle dépasse le total après filtre
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  // =========================
  // PAGINATION
  // =========================
  get totalPages(): number {
    return Math.ceil(this.filteredPosts.length / this.pageSize) || 1;
  }

  get paginatedPosts(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredPosts.slice(start, end);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // =========================
  // UTILS
  // =========================
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  formatPseudo(pseudo: string | null | undefined): string {
    if (!pseudo || !pseudo.trim()) return 'Utilisateur';
    const cleaned = pseudo.trim();
    return cleaned.length > 22 ? cleaned.slice(0, 22) + '...' : cleaned;
  }

  formatCategory(category: string | null | undefined): string {
    if (!category || !category.trim()) return 'Non classé';
    const cleaned = category.trim();
    return cleaned.length > 18 ? cleaned.slice(0, 18) + '...' : cleaned;
  }

  formatTitle(title: string | null | undefined): string {
    if (!title || !title.trim()) return 'Sans titre';
    const cleaned = title.trim();
    return cleaned.length > 70 ? cleaned.slice(0, 70) + '...' : cleaned;
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';

    const date = new Date(dateString);

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) + ' à ' + date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCategoryIcon(category: string | undefined | null): string {
    if (!category) return 'fa-solid fa-folder';

    const cat = category.toLowerCase().trim();

    switch (cat) {
      case 'sport':
        return 'fa-solid fa-football';
      case 'technologie':
      case 'tech':
        return 'fa-solid fa-microchip';
      case 'musique':
        return 'fa-solid fa-music';
      case 'cinéma':
      case 'film':
        return 'fa-solid fa-film';
      case 'voyage':
        return 'fa-solid fa-plane';
      case 'éducation':
        return 'fa-solid fa-graduation-cap';
      case 'santé':
        return 'fa-solid fa-heart-pulse';
      case 'food':
      case 'cuisine':
        return 'fa-solid fa-utensils';
      case 'art':
        return 'fa-solid fa-palette';
      case 'jeux':
      case 'gaming':
        return 'fa-solid fa-gamepad';
      default:
        return 'fa-solid fa-folder-open';
    }
  }

  getInitial(name: string | null | undefined): string {
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  goLogin(): void {
    this.router.navigate(['/login']);
  }

  // =========================
  // REACTIONS / COMMENTS
  // =========================
  react(post: any, type: string): void {
    if (!this.isLoggedIn()) {
      this.goLogin();
      return;
    }

    const token = localStorage.getItem('token');

    this.http.post(
      'http://localhost:8000/api/reactions',
      { post_id: post.id, type },
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`
        })
      }
    ).subscribe(() => this.getPosts());
  }

  comment(post: any, text: string): void {
    if (!this.isLoggedIn()) {
      this.goLogin();
      return;
    }

    if (!text || text.trim() === '') return;

    const token = localStorage.getItem('token');

    this.http.post(
      `http://localhost:8000/api/comments/${post.id}`,
      { contenu: text },
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`
        })
      }
    ).subscribe(() => {
      post.comment = '';
      this.getPosts();
    });
  }

  toggleComments(post: any): void {
    post.showComments = !post.showComments;
  }

  countLikes(post: any): number {
    return post.reactions?.filter((r: any) => r.type === 'like').length || 0;
  }

  countComments(post: any): number {
    return post.commentaires?.length || 0;
  }

  hasUserLiked(post: any): boolean {
    if (!this.currentUserId) return false;

    return post.reactions?.some(
      (r: any) => r.user_id === this.currentUserId && r.type === 'like'
    );
  }

  toggleLike(post: any): void {
    this.react(post, 'like');
  }

  onImageError(post: any): void {
    post.image = null;
  }

  onCategoryImageError(cat: any): void {
    cat.image = null;
  }
}