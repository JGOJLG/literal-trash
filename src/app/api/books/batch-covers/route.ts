import { NextResponse } from 'next/server';

const books = [
  ['Verity','Colleen Hoover'],['The Wife Upstairs','Rachel Hawkins'],['The Housemaid','Freida McFadden'],["The Housemaid's Secret",'Freida McFadden'],['Rock Paper Scissors','Alice Feeney'],['Ward D','Freida McFadden'],['The Sun Down Motel','Simone St. James'],['Before We Were Yours','Lisa Wingate'],['Hotel Nantucket','Elin Hilderbrand'],['One for the Money','Janet Evanovich'],['Fourth Wing','Rebecca Yarros'],['Purple Hibiscus','Chimamanda Ngozi Adichie'],['All Good People Here','Ashley Flowers'],['A Flicker in the Dark','Stacy Willingham'],['The Witches of New York','Ami McKay'],['The Santa Suit','Mary Kay Andrews'],['Society of Lies','Lauren Ling Brown'],['The Unhoneymooners','Christina Lauren'],['The New Couple in 5B','Lisa Unger'],['Project Hail Mary','Andy Weir'],['Blood Orange','Harriet Tyce'],['Anna O','Matthew Blake'],['Dead in the Water','John Marrs'],['A House in the Sky','Amanda Lindhout'],['The Divorce','Freida McFadden']
] as const;

function normalize(value: string | null | undefined) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function authorMatches(authors: string[], wanted: string) {
  const target = normalize(wanted).replace(/ and /g, ' ');
  return authors.some((author) => {
    const a = normalize(author);
    return a === normalize(wanted) || target.includes(a) || a.includes(target);
  });
}

async function googleCandidates(title: string, author: string) {
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', `intitle:${title} inauthor:${author}`);
  url.searchParams.set('maxResults', '10');
  url.searchParams.set('printType', 'books');
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []).map((x: any) => {
    const v = x.volumeInfo ?? {};
    const isbn = v.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier ?? v.industryIdentifiers?.find((i: any) => i.type === 'ISBN_10')?.identifier ?? null;
    const image = v.imageLinks?.extraLarge || v.imageLinks?.large || v.imageLinks?.medium || v.imageLinks?.small || v.imageLinks?.thumbnail || null;
    return {
      source_id: x.id,
      title: v.title ?? null,
      authors: v.authors ?? [],
      cover_url: image ? String(image).replace(/^http:/, 'https:').replace('&edge=curl', '') : null,
      isbn,
      source: 'google' as const,
    };
  });
}

async function openLibraryCandidate(title: string, author: string) {
  const url = new URL('https://openlibrary.org/search.json');
  url.searchParams.set('title', title);
  url.searchParams.set('author', author.split(' and ')[0]);
  url.searchParams.set('limit', '10');
  url.searchParams.set('fields', 'key,title,author_name,isbn,cover_i');
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  const wantedTitle = normalize(title);
  const docs = (data.docs ?? []).filter((doc: any) => doc.cover_i || doc.isbn?.length);
  const exact = docs.find((doc: any) => normalize(doc.title) === wantedTitle && authorMatches(doc.author_name ?? [], author));
  const titleOnly = docs.find((doc: any) => normalize(doc.title) === wantedTitle);
  const doc = exact ?? titleOnly ?? docs[0];
  if (!doc) return null;
  const isbn = doc.isbn?.find((value: string) => String(value).length === 13) ?? doc.isbn?.[0] ?? null;
  const coverUrl = doc.cover_i
    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    : isbn
      ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
      : null;
  if (!coverUrl) return null;
  return {
    source_id: doc.key ?? null,
    title: doc.title ?? title,
    authors: doc.author_name ?? [],
    cover_url: coverUrl,
    isbn,
    source: 'openlibrary' as const,
  };
}

async function resolveBook(title: string, author: string) {
  const google = await googleCandidates(title, author);
  const wantedTitle = normalize(title);
  const exact = google.find((item: any) => item.cover_url && normalize(item.title) === wantedTitle && authorMatches(item.authors ?? [], author));
  const titleOnly = google.find((item: any) => item.cover_url && normalize(item.title) === wantedTitle);
  const googlePick = exact ?? titleOnly ?? google.find((item: any) => item.cover_url) ?? null;
  if (googlePick) return googlePick;
  return await openLibraryCandidate(title, author);
}

export async function GET() {
  const results = [] as any[];
  for (const [title, author] of books) {
    try {
      const selected = await resolveBook(title, author);
      results.push({ title, author, items: selected ? [selected] : [] });
    } catch (error) {
      results.push({ title, author, items: [], error: error instanceof Error ? error.message : 'Cover lookup failed' });
    }
  }
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
}
