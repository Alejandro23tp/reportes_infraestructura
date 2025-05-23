export interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  first_page_url: string | null;
  last_page_url: string | null;
  next_page_url: string | null;
  prev_page_url: string | null;
  path: string;
  from: number;
  to: number;
}
