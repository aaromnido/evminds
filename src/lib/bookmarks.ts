export const STORAGE_KEY = "evminds_bookmarks";
const MAX_BOOKMARKS = 200;

export interface BookmarkEntry {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image_url: string;
  scraped_at: string;
  source_name: string;
  category: string;
  savedAt: string;
}

export function getBookmarks(): BookmarkEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isBookmarked(articleId: string): boolean {
  return getBookmarks().some((b) => b.id === articleId);
}

export function toggleBookmark(entry: BookmarkEntry): boolean {
  const bookmarks = getBookmarks();
  const index = bookmarks.findIndex((b) => b.id === entry.id);

  if (index >= 0) {
    bookmarks.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    return false;
  }

  bookmarks.unshift({ ...entry, savedAt: new Date().toISOString() });
  if (bookmarks.length > MAX_BOOKMARKS) {
    bookmarks.length = MAX_BOOKMARKS;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  return true;
}
