'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Post = { id:string; display_name:string; post_type:'question'|'discussion'|'hot_take'|'other'; title:string; body:string; created_at:string };
const labels = { question:'Question', discussion:'Discussion', hot_take:'Hot Take', other:'Whatever Else' };

export default function DiscussionBoard(){
  const [posts,setPosts]=useState<Post[]>([]);
  const [name,setName]=useState('');
  const [type,setType]=useState<Post['post_type']>('question');
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [message,setMessage]=useState('');

  async function load(){
    if(!supabase)return;
    const {data}=await supabase.from('literal_trash_board_posts').select('*').order('created_at',{ascending:false}).limit(100);
    if(data)setPosts(data as Post[]);
  }
  useEffect(()=>{
    if(!supabase)return;
    void load();
    const client=supabase;
    const channel=client.channel('literal-trash-board-live').on('postgres_changes',{event:'*',schema:'public',table:'literal_trash_board_posts'},()=>void load()).subscribe();
    return()=>{void client.removeChannel(channel)};
  },[]);

  async function submit(){
    setMessage('');
    if(!supabase)return;
    if(!name.trim()||!title.trim()||!body.trim()){setMessage('Add your name, a subject, and what you want to say.');return;}
    const {error}=await supabase.from('literal_trash_board_posts').insert({display_name:name.trim(),post_type:type,title:title.trim(),body:body.trim()});
    if(error){setMessage(error.message);return;}
    setTitle('');setBody('');setMessage('Posted to the board.');void load();
  }

  return <section className="section boardSection" id="board">
    <div className="sectionHead"><div><div className="eyebrow">The club group chat, but prettier</div><h3>The Board</h3><p className="muted">Questions, discussion topics, theories, hot takes, or whatever you want everyone to talk about.</p></div><span className="pill"><MessageCircle size={15}/> Live board</span></div>
    <div className="boardLayout">
      <div className="glass boardComposer">
        <div className="eyebrow">Put it on the board</div><h4>What do we need to discuss?</h4>
        <input className="field" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/>
        <div className="boardTypes">{(Object.keys(labels) as Post['post_type'][]).map(v=><button key={v} className={`pill ${type===v?'boardTypeActive':''}`} onClick={()=>setType(v)}>{labels[v]}</button>)}</div>
        <input className="field" placeholder="Question or topic" value={title} onChange={e=>setTitle(e.target.value)}/>
        <textarea className="field boardTextarea" placeholder="Say whatever you want..." value={body} onChange={e=>setBody(e.target.value)} maxLength={3000}/>
        <button className="btn" onClick={()=>void submit()}>Submit to the Board <Send size={15}/></button>
        {message?<p className="muted">{message}</p>:null}
      </div>
      <div className="boardFeed">
        {posts.length===0?<div className="glass boardEmpty"><MessageCircle size={30}/><h4>Nothing on the board yet.</h4><p className="muted">Someone has to start the chaos.</p></div>:posts.map(post=><article className="glass boardPost" key={post.id}>
          <div className="boardPostTop"><span className="chip">{labels[post.post_type]}</span><span className="muted boardTime">{new Date(post.created_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span></div>
          <h4>{post.title}</h4><p>{post.body}</p><div className="boardBy">Submitted by <strong>{post.display_name}</strong></div>
        </article>)}
      </div>
    </div>
  </section>;
}
