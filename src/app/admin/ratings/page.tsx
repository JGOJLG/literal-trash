'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

type Rating = {
  rating_id: string;
  book_id: string;
  book_title: string;
  book_author: string;
  display_name: string;
  hook_score: number;
  story_score: number;
  overall_score: number;
  created_at: string;
};

export default function AdminRatingsPage() {
  const [password, setPassword] = useState('');
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadRatings(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    const client = supabase;
    if (!client) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    const { data, error: rpcError } = await client.rpc('literal_trash_admin_list_ratings', { admin_password: password });
    if (rpcError) {
      setUnlocked(false);
      setError('That password is not correct.');
    } else {
      setRatings((data || []) as Rating[]);
      setUnlocked(true);
    }
    setLoading(false);
  }

  async function deleteRating(rating: Rating) {
    if (!window.confirm(`Delete ${rating.display_name}'s rating for ${rating.book_title}?`)) return;
    const client = supabase;
    if (!client) return;
    setDeleting(rating.rating_id);
    setError('');
    const { data, error: rpcError } = await client.rpc('literal_trash_admin_delete_rating', {
      admin_password: password,
      target_rating_id: rating.rating_id,
    });
    if (rpcError || !data) {
      setError('Could not delete that rating. Please try again.');
    } else {
      setRatings((current) => current.filter((item) => item.rating_id !== rating.rating_id));
    }
    setDeleting(null);
  }

  return (
    <main style={{ minHeight: '100vh', padding: '48px 20px', background: 'radial-gradient(circle at 15% 10%, #dff4ff 0, transparent 34%), radial-gradient(circle at 85% 18%, #e4e6ff 0, transparent 32%), linear-gradient(145deg, #f8fcff, #eef5ff 50%, #f8f6ff)' }}>
      <div style={{ maxWidth: 1050, margin: '0 auto' }}>
        <a href="/" style={{ color: '#193f78', textDecoration: 'none', fontWeight: 700 }}>← Back to Literal Trash</a>
        <div style={{ marginTop: 22, padding: '32px', borderRadius: 30, background: 'rgba(255,255,255,.72)', border: '1px solid rgba(255,255,255,.9)', boxShadow: '0 24px 70px rgba(65,104,170,.14)', backdropFilter: 'blur(20px)' }}>
          <div style={{ fontSize: 12, letterSpacing: 2.2, textTransform: 'uppercase', color: '#5576aa', fontWeight: 800 }}>Literal Trash Admin</div>
          <h1 style={{ margin: '8px 0 8px', fontSize: 'clamp(36px,6vw,68px)', lineHeight: 1, color: '#102d59', fontFamily: 'Georgia, serif', fontWeight: 500 }}>Ratings</h1>
          <p style={{ color: '#5d7091', marginTop: 0 }}>See exactly who rated each book, their Hook and Story scores, and remove a submission when needed.</p>

          {!unlocked ? (
            <form onSubmit={loadRatings} style={{ maxWidth: 430, marginTop: 28 }}>
              <label style={{ display: 'block', color: '#24466f', fontWeight: 700, marginBottom: 8 }}>Admin password</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus style={{ flex: '1 1 230px', padding: '14px 16px', borderRadius: 16, border: '1px solid #c9d9ee', background: 'rgba(255,255,255,.9)', fontSize: 16, outline: 'none' }} />
                <button disabled={loading || !password} style={{ padding: '14px 22px', border: 0, borderRadius: 16, background: '#173f78', color: 'white', fontWeight: 800, cursor: 'pointer' }}>{loading ? 'Opening…' : 'Open ratings'}</button>
              </div>
            </form>
          ) : (
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <strong style={{ color: '#24466f' }}>{ratings.length} submitted rating{ratings.length === 1 ? '' : 's'}</strong>
                <button onClick={() => { setUnlocked(false); setRatings([]); setPassword(''); }} style={{ border: '1px solid #cbd9ec', background: 'rgba(255,255,255,.75)', borderRadius: 14, padding: '9px 14px', color: '#24466f', cursor: 'pointer' }}>Lock admin</button>
              </div>
              {ratings.length === 0 ? <div style={{ padding: 24, borderRadius: 20, background: 'rgba(255,255,255,.65)', color: '#667a99' }}>No individual ratings have been submitted yet.</div> : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {ratings.map((rating) => (
                    <div key={rating.rating_id} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.5fr) minmax(170px,1.4fr) repeat(3,minmax(70px,.55fr)) auto', gap: 14, alignItems: 'center', padding: '18px 20px', borderRadius: 20, background: 'rgba(255,255,255,.74)', border: '1px solid rgba(188,211,239,.7)', boxShadow: '0 10px 28px rgba(67,103,155,.08)' }}>
                      <div><div style={{ color: '#15365f', fontWeight: 850 }}>{rating.display_name}</div><div style={{ color: '#8492aa', fontSize: 12, marginTop: 4 }}>{new Date(rating.created_at).toLocaleString()}</div></div>
                      <div><div style={{ color: '#284e7d', fontWeight: 750 }}>{rating.book_title}</div><div style={{ color: '#8292aa', fontSize: 13 }}>{rating.book_author}</div></div>
                      <div><div style={{ color: '#8492aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Hook</div><strong style={{ color: '#15365f', fontSize: 20 }}>{Number(rating.hook_score).toFixed(1)}</strong></div>
                      <div><div style={{ color: '#8492aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Story</div><strong style={{ color: '#15365f', fontSize: 20 }}>{Number(rating.story_score).toFixed(1)}</strong></div>
                      <div><div style={{ color: '#8492aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Overall</div><strong style={{ color: '#15365f', fontSize: 20 }}>{Number(rating.overall_score).toFixed(1)}</strong></div>
                      <button onClick={() => deleteRating(rating)} disabled={deleting === rating.rating_id} style={{ border: '1px solid #e8c9d2', background: '#fff7fa', color: '#9a3152', borderRadius: 14, padding: '10px 13px', fontWeight: 800, cursor: 'pointer' }}>{deleting === rating.rating_id ? 'Deleting…' : 'Delete'}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {error && <div style={{ marginTop: 16, color: '#a12f50', fontWeight: 700 }}>{error}</div>}
        </div>
      </div>
      <style jsx>{`@media (max-width: 800px){div[style*="grid-template-columns: minmax(180px"]{grid-template-columns:1fr 1fr !important;} div[style*="grid-template-columns: minmax(180px"] > div:nth-child(1), div[style*="grid-template-columns: minmax(180px"] > div:nth-child(2){grid-column:1/-1;}}`}</style>
    </main>
  );
}
