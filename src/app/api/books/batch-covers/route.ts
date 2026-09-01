import { NextResponse } from 'next/server';

const books = [
  ['Verity','Colleen Hoover'],['The Wife Upstairs','Rachel Hawkins'],['The Housemaid','Freida McFadden'],["The Housemaid's Secret",'Freida McFadden'],['Rock Paper Scissors','Alice Feeney'],['Ward D','Freida McFadden'],['The Sun Down Motel','Simone St. James'],['Before We Were Yours','Lisa Wingate'],['Hotel Nantucket','Elin Hilderbrand'],['One for the Money','Janet Evanovich'],['Fourth Wing','Rebecca Yarros'],['Purple Hibiscus','Chimamanda Ngozi Adichie'],['All Good People Here','Ashley Flowers'],['A Flicker in the Dark','Stacy Willingham'],['The Witches of New York','Ami McKay'],['The Santa Suit','Mary Kay Andrews'],['Society of Lies','Lauren Ling Brown'],['The Unhoneymooners','Christina Lauren'],['The New Couple in 5B','Lisa Unger'],['Project Hail Mary','Andy Weir'],['Blood Orange','Harriet Tyce'],['Anna O','Matthew Blake'],['Dead in the Water','John Marrs'],['A House in the Sky','Amanda Lindhout'],['The Divorce','Freida McFadden']
] as const;

export async function GET() {
  const results = await Promise.all(books.map(async ([title, author]) => {
    const url = new URL('https://www.googleapis.com/books/v1/volumes');
    url.searchParams.set('q', `intitle:${title} inauthor:${author}`);
    url.searchParams.set('maxResults', '5');
    url.searchParams.set('printType', 'books');
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { title, author, error: `Google Books ${res.status}` };
    const data = await res.json();
    const items = (data.items ?? []).map((x: any) => {
      const v = x.volumeInfo ?? {};
      return {
        source_id: x.id,
        title: v.title ?? null,
        authors: v.authors ?? [],
        cover_url: (v.imageLinks?.extraLarge || v.imageLinks?.large || v.imageLinks?.medium || v.imageLinks?.small || v.imageLinks?.thumbnail || null)?.replace(/^http:/, 'https:'),
        isbn: v.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier ?? v.industryIdentifiers?.[0]?.identifier ?? null,
      };
    });
    return { title, author, items };
  }));
  return NextResponse.json({ results });
}
