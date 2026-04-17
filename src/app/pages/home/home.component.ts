import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { AuthService } from '../../services/auth.service';
import { CategoryFilterService } from '../../services/category-filter.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  user: any = null;
  posts: any[] = [];
  filteredPosts: any[] = [];
  categories: any[] = [];

  loadingPosts = false;
  posting = false;
  error = '';
  showPostForm = false;
  activeCategoryId: number | null = null;

  // ✅ Pagination
  currentPage = 1;
  pageSize = 3;

  constructor(
    public auth: AuthService,
    private http: HttpClient,
    private categoryFilter: CategoryFilterService
  ) {}

  ngOnInit(): void {
    this.auth.user$.subscribe((u) => {
      this.user = u;
    });

    this.loadPosts();
    this.loadCategories();

    this.categoryFilter.categoryId$.subscribe((id) => {
      this.activeCategoryId = id;
      this.currentPage = 1; // reset pagination si filtre change
      this.applyFilter();
    });
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.showPostForm) {
      this.closePostModal();
    }
  }

  getHeaders() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.getToken()}`
      })
    };
  }

  // =========================
  // POSTS
  // =========================
  loadPosts(): void {
    this.loadingPosts = true;

    this.http.get<any[]>(`${environment.apiUrl}/posts`, this.getHeaders())
      .subscribe({
        next: (res: any[]) => {
          this.posts = (res || []).map((post: any) => ({
            ...post,
            commentaires: Array.isArray(post.commentaires) ? post.commentaires : [],
            reactions: Array.isArray(post.reactions) ? post.reactions : [],
            showComment: false,
            comment: ''
          }));

          this.loadingPosts = false;
          this.applyFilter();
        },
        error: (err: any) => {
          console.error('Erreur chargement posts', err);
          this.posts = [];
          this.filteredPosts = [];
          this.loadingPosts = false;
        }
      });
  }

  applyFilter(): void {
    if (this.activeCategoryId === null) {
      this.filteredPosts = this.posts;
    } else {
      this.filteredPosts = this.posts.filter((p: any) =>
        p.categorie?.id === this.activeCategoryId ||
        p.categorie_id === this.activeCategoryId
      );
    }

    // si la page actuelle dépasse après filtre
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
  // FORMATAGE / AFFICHAGE
  // =========================
  formatPseudo(pseudo: string | null | undefined): string {
    if (!pseudo || !pseudo.trim()) return 'Utilisateur';
    const cleaned = pseudo.trim();
    return cleaned.length > 22 ? cleaned.slice(0, 22) + '...' : cleaned;
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

  getInitial(name: string | null | undefined): string {
    if (!name || !name.trim()) return 'U';
    return name.trim().charAt(0).toUpperCase();
  }

  // =========================
  // COMMENTAIRES
  // =========================
  loadComments(post: any): void {
    this.http.get<any[]>(
      `${environment.apiUrl}/posts/${post.id}/comments`,
      this.getHeaders()
    ).subscribe({
      next: (res: any[]) => {
        post.commentaires = Array.isArray(res) ? res : [];
        post.showComment = true;
      },
      error: (err: any) => {
        console.error('Erreur chargement commentaires', err);
      }
    });
  }

  comment(post: any, content: string): void {
    const message = (content || '').trim();
    if (!message) return;

    this.http.post<any>(
      `${environment.apiUrl}/posts/${post.id}/comments`,
      { contenu: message },
      this.getHeaders()
    ).subscribe({
      next: (res: any) => {
        post.comment = '';

        if (!Array.isArray(post.commentaires)) {
          post.commentaires = [];
        }

        if (res?.commentaire) {
          post.commentaires.push(res.commentaire);
        }

        post.showComment = true;
      },
      error: (err: any) => {
        console.error('Erreur commentaire', err);
      }
    });
  }

  toggleComments(post: any): void {
    post.showComment = !post.showComment;

    if (post.showComment && (!post.commentaires || post.commentaires.length === 0)) {
      this.loadComments(post);
    }
  }

  // =========================
  // CATEGORIES
  // =========================
  loadCategories(): void {
    this.http.get<any[]>(`${environment.apiUrl}/categories`, this.getHeaders())
      .subscribe({
        next: (res: any[]) => {
          this.categories = res || [];
        },
        error: (err: any) => {
          console.error('Erreur chargement catégories', err);
          this.categories = [];
        }
      });
  }

  selectCategory(categoryId: number | null): void {
    this.activeCategoryId = categoryId;
    this.currentPage = 1;
    this.applyFilter();
  }

  // =========================
  // CREATE POST
  // =========================
  createPost(postData: {
    titre: string;
    contenu: string;
    categorie_id: number;
    image: File | null;
  }): void {
    if (!postData.titre.trim() || !postData.contenu.trim()) {
      this.error = 'Le titre et le contenu sont obligatoires.';
      return;
    }

    this.error = '';
    this.posting = true;

    const formData = new FormData();
    formData.append('titre', postData.titre);
    formData.append('contenu', postData.contenu);
    formData.append('categorie_id', postData.categorie_id.toString());

    if (postData.image) {
      formData.append('image', postData.image);
    }

    this.http.post(`${environment.apiUrl}/posts`, formData, this.getHeaders())
      .subscribe({
        next: () => {
          this.posting = false;
          this.showPostForm = false;
          this.error = '';
          this.loadPosts();
        },
        error: (err: any) => {
          this.posting = false;
          console.error('Erreur création post', err);

          if (err?.error?.errors) {
            const firstError = Object.values(err.error.errors)[0] as string[];
            this.error = firstError[0];
          } else {
            this.error =
              err?.error?.error ||
              err?.error?.message ||
              'Erreur lors de la publication';
          }
        }
      });
  }

  // =========================
  // REACTIONS
  // =========================
  react(post: any, type: 'like' | 'dislike'): void {
    if (!this.user?.id) return;

    this.http.post(
      `${environment.apiUrl}/posts/${post.id}/reactions`,
      { type },
      this.getHeaders()
    ).subscribe({
      next: () => {
        if (!Array.isArray(post.reactions)) {
          post.reactions = [];
        }

        const existing = post.reactions.find(
          (r: any) => r.user_id === this.user.id
        );

        if (existing) {
          existing.type = type;
        } else {
          post.reactions.push({
            user_id: this.user.id,
            type
          });
        }
      },
      error: (err: any) => {
        console.error('Erreur réaction', err);
      }
    });
  }

  // =========================
  // COMPTEURS
  // =========================
  countLikes(post: any): number {
    if (!post?.reactions) return 0;
    return post.reactions.filter((r: any) => r.type === 'like').length;
  }

  countDislikes(post: any): number {
    if (!post?.reactions) return 0;
    return post.reactions.filter((r: any) => r.type === 'dislike').length;
  }

  countComments(post: any): number {
    if (Array.isArray(post.commentaires)) {
      return post.commentaires.length;
    }
    return post.comments_count ?? 0;
  }

  // =========================
  // MODAL
  // =========================
  openPostModal(): void {
    this.showPostForm = true;
    this.error = '';
  }

  closePostModal(): void {
    this.showPostForm = false;
    this.error = '';
  }

  // =========================
  // REACTION UTILISATEUR CONNECTÉ
  // =========================
  userReactionType(post: any): 'like' | 'dislike' | null {
    if (!post?.reactions || !this.user) return null;

    const reaction = post.reactions.find(
      (r: any) => r.user_id === this.user.id
    );

    return reaction ? reaction.type : null;
  }
}