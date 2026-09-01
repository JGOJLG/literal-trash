import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ items: [] });
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', q);
  url.searchParams.set('maxResults', '12');
  url.searchParams.set('printType', 'books');
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return NextResponse.json({ items: [] }, { status: 502 });
  const data = await res.json();
  const items = (data.items ?? []).map((x: any) => {
    const v = x.volumeInfo ?? {};
    return {
      source_id: x.id,
      title: v.title ?? 'Untitled',
      author: Array.isArray(v.authors) ? v.authors.join(', ') : 'Unknown author',
      description: v.description ?? null,
      cover_url: v.imageLinks?.thumbnail?.replace(/^http:/, 'https:') ?? null,
      page_count: v.pageCount ?? null,
      published_date: v.publishedDate ?? null,
      categories: v.categories ?? [],
      isbn: v.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier ?? v.industryIdentifiers?.[0]?.identifier ?? null,
    };
  });
  return NextResponse.json({ items });
}
