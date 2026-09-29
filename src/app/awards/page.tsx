'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Crown, Sparkles, Trophy, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Member = { id: string; name: string };
type Book = { id: string; title: string; author: string; cover_url: string | null; meeting_date: string | null; status: string };
type Vote = { id: string; year: number; category: string; member_id: string; book_id: string };
type Category = { key: string; title: string; question: string };
type Result = { book: Book; count: number; voters: string[] };

const YEAR = 2026;
const CATEGORIES: Category[] = [
  { key: 'book_of_year', title: 'Book of the Year', question: 'Which book deserves the crown?' },
  { key: 'literal_trash', title: 'Literal Trash 🗑️', question: 'Which book belongs directly in the trash?' },
  { key: 'best_story', title: 'Best Story', question: 'Which story stayed with you the most?' },
  { key: 'page_turner', title: "Couldn't Put It Down", question: 'Which book had you turning pages fastest?' },
  { key: 'plot_twist', title: 'Biggest Plot Twist', question: 'Which book shocked you the most?' },
  { key: 'overrated', title: 'Most Overrated', question: 'Which book got more love than it deserved?' },
  { key: 'underrated', title: 'Most Underrated', question: 'Which book deserved way more love?' },
  { key: 'recommend', title: 'Most Likely to Recommend', question: 'Which one would you actually give to a friend?' },
];

export default function Awards() {
  const [members, setMembers] = useState<Member[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [memberId, setMemberId] = useState('');
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);

  const category = CATEGORIES[step];

  async function load() {
    if (!supabase) return;
    const [memberRes, bookRes, voteRes] = await Promise.all([
      supabase.from('literal_trash_members').select('id,name').eq('active', true).order('name'),
      supabase.from('literal_trash_books').select('id,title,author,cover_url,meeting_date,status').gte('meeting_date', YEAR + '-01-01').lte('meeting_date', YEAR + '-12-31').in('status', ['past', 'current']).order('meeting_date'),
      supabase.from('literal_trash_award_votes').select('id,year,category,member_id,book_id').eq('year', YEAR),
    ]);
    setMembers((memberRes.data || []) as Member[]);
    setBooks((bookRes.data || []) as Book[]);
    setVotes((voteRes.data || []) as Vote[]);
  }

  useEffect(() => {
    void load();
    if (!supabase) return;
    const client = supabase;
    const channel = client.channel('awards-live-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'literal_trash_award_votes' }, () => { void load(); })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, []);

  const categoryVotes = category ? votes.filter((vote) => vote.category === category.key) : [];
  const savedVote = category ? votes.find((vote) => vote.category === category.key && vote.member_id === memberId) : undefined;

  useEffect(() => {
    setChoice(savedVote ? savedVote.book_id : '');
    setRevealed(Boolean(savedVote));
  }, [step, memberId, savedVote?.book_id]);

  const results: Result[] = books.map((book) => {
    const bookVotes = categoryVotes.filter((vote) => vote.book_id === book.id);
    const voters: string[] = [];
    bookVotes.forEach((vote) => {
      const member = members.find((item) => item.id === vote.member_id);
      if (member) voters.push(member.name);
    });
    return { book, count: bookVotes.length, voters };
  }).sort((a, b) => b.count - a.count);

  async function submitVote() {
    if (!supabase || !memberId || !choice || !category) return;
    setSaving(true);
    const existing = votes.find((vote) => vote.year === YEAR && vote.category === category.key && vote.member_id === memberId);
    if (existing) {
      await supabase.from('literal_trash_award_votes').update({ book_id: choice, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('literal_trash_award_votes').insert({ year: YEAR, category: category.key, member_id: memberId, book_id: choice });
    }
    await load();
    setSaving(false);
    setRevealed(true);
  }

  function nextAward() {
    if (step >= CATEGORIES.length - 1) return;
    setStep((current) => current + 1);
    setChoice('');
    setRevealed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function resetAwards() {
    if (!supabase) return;
    if (!window.confirm('Reset all 2026 Trashies votes and start over?')) return;
    setSaving(true);
    const response = await supabase.rpc('literal_trash_reset_awards', { p_year: YEAR });
    if (!response.error) {
      setVotes([]);
      setStep(0);
      setChoice('');
      setRevealed(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setSaving(false);
  }

  const me = members.find((member) => member.id === memberId);
  const done = step === CATEGORIES.length - 1 && revealed;

  if (!memberId) {
    return <main className="liveAwards">
      <div className="liveAwardsTop"><Link href="/"><ArrowLeft /> Home</Link></div>
      <section className="awardsWelcome">
        <div className="welcomeCrown"><Crown /></div>
        <span className="awardsMini">LITERAL TRASH BOOK CLUB</span>
        <h1>The {YEAR}<br /><em>Trashies</em></h1>
        <p>Vote live. See what everyone thinks. Crown the winners.</p>
        <div className="joinBox">
          <label>Who are you?</label>
          <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
            <option value="">Select your name</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </div>
      </section>
    </main>;
  }

  if (!category) return null;

  return <main className="liveAwards">
    <header className="liveGameHeader">
      <button onClick={() => setMemberId('')}>{me?.name}</button>
      <div className="liveHeaderActions">
        <span><b>{step + 1}</b> / {CATEGORIES.length}</span>
        <button className="resetAwardsButton" onClick={() => { void resetAwards(); }}>Reset</button>
      </div>
    </header>
    <div className="gameProgress"><i style={{ width: ((step + 1) / CATEGORIES.length * 100) + '%' }} /></div>
    <section className="questionScreen">
      <span className="questionLabel">AWARD {String(step + 1).padStart(2, '0')}</span>
      <h1>{category.title}</h1>
      <p>{category.question}</p>
      {!revealed ? <>
        <div className="mobileBookChoices">
          {books.map((book) => <button key={book.id} className={'mobileBookChoice ' + (choice === book.id ? 'picked' : '')} onClick={() => setChoice(book.id)}>
            {book.cover_url ? <img src={book.cover_url} alt="" /> : <div className="mobileCoverFallback">LT</div>}
            <div><strong>{book.title}</strong><small>{book.author}</small></div>
            {choice === book.id && <span className="choiceCheck"><Check /></span>}
          </button>)}
        </div>
        <button className="submitAwardVote" disabled={!choice || saving} onClick={() => { void submitVote(); }}>
          {saving ? 'Saving...' : 'Submit Vote'} <Sparkles />
        </button>
      </> : <div className="resultsReveal">
        <div className="resultsLive"><span /> LIVE RESULTS <Users /> {categoryVotes.length}</div>
        <div className="resultRows">
          {results.filter((result) => result.count > 0).map((result, index) => {
            const percent = categoryVotes.length ? Math.round(result.count / categoryVotes.length * 100) : 0;
            return <div className={'resultRow ' + (index === 0 ? 'leader' : '')} key={result.book.id}>
              <div className="resultRank">{index === 0 ? <Trophy /> : index + 1}</div>
              {result.book.cover_url && <img src={result.book.cover_url} alt="" />}
              <div className="resultInfo">
                <div className="resultTitleLine"><strong>{result.book.title}</strong><b>{percent}%</b></div>
                <div className="resultBar"><i style={{ width: percent + '%' }} /></div>
                <small>{result.count} vote{result.count === 1 ? '' : 's'}</small>
                <div className="resultVoters">{result.voters.map((name) => <span key={name}>{name}</span>)}</div>
              </div>
            </div>;
          })}
        </div>
        <div className="savedVote"><Check /> Your vote is saved</div>
        {!done ? <button className="nextAward" onClick={nextAward}>Next Award <span>→</span></button> :
          <div className="awardsComplete"><Crown /><h2>Ballot Complete!</h2><p>All of your votes are saved.</p></div>}
      </div>}
    </section>
  </main>;
}
