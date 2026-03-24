/**
 * Shared infinite scroll module.
 *
 * Reads configuration from a DOM element with id="infinite-scroll-config":
 *   data-cursor       — initial pagination cursor (ISO timestamp)
 *   data-category     — category slug filter (optional)
 *   data-source       — source slug filter (optional)
 */

// --- Constants ---
const BREAKPOINT_MOBILE = 768;
const BREAKPOINT_TABLET = 1024;
const CARDS_MOBILE = 10;
const CARDS_TABLET = 16;
const CARDS_DESKTOP = 21;
const OBSERVER_ROOT_MARGIN = "200px";
const OBSERVER_THRESHOLD = 0.1;
const RESIZE_DEBOUNCE_MS = 250;

// --- State ---
let cursor: string | null = null;
let isLoading = false;
let hasMore = true;
let observer: IntersectionObserver | null = null;
let categorySlug: string | null = null;
let sourceSlug: string | null = null;
let contentType: string | null = null;

// --- DOM refs ---
let articlesGrid: HTMLElement | null = null;
let loadingSkeletons: HTMLElement | null = null;

function getLimitForBreakpoint(): number {
  const width = window.innerWidth;
  if (width < BREAKPOINT_MOBILE) return CARDS_MOBILE;
  if (width < BREAKPOINT_TABLET) return CARDS_TABLET;
  return CARDS_DESKTOP;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Render an article card using safe DOM methods (XSS-safe).
 */
function renderArticleCard(article: any): HTMLElement {
  const image = article.image_url || "/images/placeholder-image.webp";
  const title = article.title;
  const date = formatDate(article.published_at);
  const source = article.source.name;
  const category = article.category;
  const articleContentType = article.content_type || "news";
  const isVideo = articleContentType === "video";
  const href = isVideo ? "/video/" + article.slug : "/articulo/" + article.slug;
  const identifier = article.id;
  const excerptText = article.excerpt || "";

  const articleEl = document.createElement("article");
  articleEl.className = "article-card";

  // Photo link
  const photoLink = document.createElement("a");
  photoLink.href = href;
  photoLink.className = "article-card__photo-link";

  const photoDiv = document.createElement("div");
  photoDiv.className = "article-card__photo";

  const img = document.createElement("img");
  img.src = image;
  img.alt = title;
  img.loading = "lazy";
  img.width = 600;
  img.height = 300;

  photoDiv.appendChild(img);

  // Play overlay for video cards
  if (isVideo) {
    const overlay = document.createElement("div");
    overlay.className = "video-play-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "video-play-overlay__icon");
    svg.setAttribute("viewBox", "0 0 48 48");
    svg.setAttribute("fill", "none");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "24");
    circle.setAttribute("cy", "24");
    circle.setAttribute("r", "23");
    circle.setAttribute("fill", "rgba(0,0,0,0.55)");
    circle.setAttribute("stroke", "white");
    circle.setAttribute("stroke-width", "2");

    const playPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    playPath.setAttribute("d", "M19 15L35 24L19 33V15Z");
    playPath.setAttribute("fill", "white");

    svg.appendChild(circle);
    svg.appendChild(playPath);
    overlay.appendChild(svg);
    photoDiv.appendChild(overlay);
  }

  // Actions: comment count + bookmark (top-right of photo)
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "card-actions";

  if (identifier) {
    const countSpan = document.createElement("span");
    countSpan.className = "disqus-comment-count";
    countSpan.setAttribute("data-disqus-identifier", identifier);
    countSpan.hidden = true;
    actionsDiv.appendChild(countSpan);
  }

  // Bookmark button
  const bookmarkBtn = document.createElement("button");
  bookmarkBtn.className = "bookmark-btn";
  bookmarkBtn.setAttribute("data-article-id", identifier);
  bookmarkBtn.setAttribute("aria-label", "Guardar artículo");
  bookmarkBtn.setAttribute("aria-pressed", "false");

  const bookmarkData = JSON.stringify({
    id: identifier,
    slug: article.slug,
    title: title,
    excerpt: excerptText,
    image_url: image,
    scraped_at: article.scraped_at || "",
    source_name: source,
    category: category,
    content_type: articleContentType,
    savedAt: "",
  });
  bookmarkBtn.setAttribute("data-article", bookmarkData);

  const defaultIcon = document.createElement("img");
  defaultIcon.className = "bookmark-btn__icon bookmark-btn__icon--default";
  defaultIcon.src = "/icons/icon-bookmark-default.svg";
  defaultIcon.width = 24;
  defaultIcon.height = 24;
  defaultIcon.alt = "";

  const activeIcon = document.createElement("img");
  activeIcon.className = "bookmark-btn__icon bookmark-btn__icon--active";
  activeIcon.src = "/icons/icon-bookmark-active.svg";
  activeIcon.width = 24;
  activeIcon.height = 24;
  activeIcon.alt = "";
  activeIcon.style.display = "none";

  if ((window as any).__evminds_bookmarks?.isBookmarked(identifier)) {
    defaultIcon.style.display = "none";
    activeIcon.style.display = "";
    bookmarkBtn.setAttribute("aria-pressed", "true");
  }

  bookmarkBtn.appendChild(defaultIcon);
  bookmarkBtn.appendChild(activeIcon);
  actionsDiv.appendChild(bookmarkBtn);

  photoDiv.appendChild(actionsDiv);
  photoLink.appendChild(photoDiv);

  // Content
  const contentDiv = document.createElement("div");
  contentDiv.className = "article-card__content";

  // Header
  const headerDiv = document.createElement("div");
  headerDiv.className = "article-card__header";

  const titleLink = document.createElement("a");
  titleLink.href = href;
  titleLink.className = "article-card__title-link";

  const titleEl = document.createElement("h3");
  titleEl.className = "article-card__title";
  titleEl.textContent = title;

  titleLink.appendChild(titleEl);

  // Arrow SVG
  const arrowSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrowSvg.setAttribute("class", "article-card__arrow");
  arrowSvg.setAttribute("width", "11");
  arrowSvg.setAttribute("height", "11");
  arrowSvg.setAttribute("viewBox", "0 0 11 11");
  arrowSvg.setAttribute("fill", "none");
  arrowSvg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M1 10L10 1M10 1H3M10 1V8");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  arrowSvg.appendChild(path);

  headerDiv.appendChild(titleLink);
  headerDiv.appendChild(arrowSvg);
  contentDiv.appendChild(headerDiv);

  // Date
  const dateEl = document.createElement("p");
  dateEl.className = "article-card__date";
  dateEl.textContent = date;
  contentDiv.appendChild(dateEl);

  // Footer: badges + bookmark
  const footerDiv = document.createElement("div");
  footerDiv.className = "article-card__footer";

  const badgesDiv = document.createElement("div");
  badgesDiv.className = "article-card__badges";

  const sourceBadge = document.createElement("span");
  sourceBadge.className = "badge badge--filled";
  sourceBadge.textContent = source;

  const categoryBadge = document.createElement("span");
  categoryBadge.className = "badge badge--outlined";
  categoryBadge.textContent = category;

  badgesDiv.appendChild(sourceBadge);
  badgesDiv.appendChild(categoryBadge);
  footerDiv.appendChild(badgesDiv);

  contentDiv.appendChild(footerDiv);

  articleEl.appendChild(photoLink);
  articleEl.appendChild(contentDiv);

  return articleEl;
}

async function loadMoreArticles(): Promise<void> {
  if (isLoading || !hasMore || !cursor) return;

  isLoading = true;
  if (loadingSkeletons) loadingSkeletons.style.display = "grid";

  try {
    const limit = getLimitForBreakpoint();
    let url = `/api/articles?limit=${limit}&cursor=${encodeURIComponent(cursor)}`;

    if (contentType) {
      url += `&content_type=${encodeURIComponent(contentType)}`;
    }
    if (categorySlug) {
      url += `&category=${encodeURIComponent(categorySlug)}`;
    }
    if (sourceSlug) {
      url += `&source=${encodeURIComponent(sourceSlug)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch articles");
    }

    const data = await response.json();

    if (loadingSkeletons) loadingSkeletons.style.display = "none";

    if (data.articles.length === 0) {
      hasMore = false;
      if (observer) observer.disconnect();
      return;
    }

    const fragment = document.createDocumentFragment();
    data.articles.forEach((article: any) => {
      fragment.appendChild(renderArticleCard(article));
    });

    articlesGrid!.appendChild(fragment);

    // Refresh Disqus comment counts for new articles
    if ((window as any).refreshDisqusCount) {
      (window as any).refreshDisqusCount();
    }

    cursor = data.nextCursor;

    if (!data.nextCursor) {
      hasMore = false;
      if (observer) observer.disconnect();
    } else {
      setupObserver();
    }
  } catch (error) {
    console.error("Error loading articles:", error);
    if (loadingSkeletons) loadingSkeletons.style.display = "none";
  } finally {
    isLoading = false;
  }
}

function setupObserver(): void {
  if (observer) observer.disconnect();
  if (!articlesGrid) return;

  const cards = articlesGrid.querySelectorAll(".article-card");
  if (cards.length < 2) return;

  const targetCard = cards[cards.length - 2];

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadMoreArticles();
        }
      });
    },
    {
      rootMargin: OBSERVER_ROOT_MARGIN,
      threshold: OBSERVER_THRESHOLD,
    },
  );

  observer.observe(targetCard);
}

/**
 * Initialize infinite scroll. Reads config from #infinite-scroll-config element.
 */
function init(): void {
  const config = document.getElementById("infinite-scroll-config");
  if (!config) return;

  cursor = config.dataset.cursor || null;
  categorySlug = config.dataset.category || null;
  sourceSlug = config.dataset.source || null;
  contentType = config.dataset.contentType || null;

  articlesGrid = document.getElementById("articles-grid");
  loadingSkeletons = document.getElementById("loading-skeletons");

  if (articlesGrid && cursor && hasMore) {
    setupObserver();
  }

  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (hasMore && !isLoading) {
        setupObserver();
      }
    }, RESIZE_DEBOUNCE_MS);
  });
}

init();
