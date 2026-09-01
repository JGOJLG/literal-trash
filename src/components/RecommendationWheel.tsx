'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Recommendation = { id:string; display_name:string; title:string; author:string|null; active:boolean; winner:boolean; eliminated_at:string|null; created_at:string };
type WheelState = { spin_nonce:number; selected_nomination_id:string|null; started_at:string|null; round:number; status:'collecting'|'spinning'|'winner' };

const wheelColors = ['#0b2d61','#174c92','#5686d3','#8eb4ec','#c5dcff','#769fdd','#315f9e','#a9c8f4'];

export default function RecommendationWheel(){
  const [rows,setRows]=useState<Recommendation[]>([]);
  const [state,setState]=useState<WheelState>({spin_nonce:0,selected_nomination_id:null,started_at:null,round:0,status:'collecting'});
  const [name,setName]=useState(''); const [title,setTitle]=useState(''); const [author,setAuthor]=useState(''); const [message,setMessage]=useState('');
  const [adminPassword,setAdminPassword]=useState(''); const [adminOpen,setAdminOpen]=useState(false); const [adminMessage,setAdminMessage]=useState('');
  const [rotation,setRotation]=useState(0); const lastNonce=useRef(0);

  const active=useMemo(()=>rows.filter(r=>r.active),[rows]);
  const selected=rows.find(r=>r.id===state.selected_nomination_id) ?? null;

  async function load(){
    if(!supabase) return;
    const [{data:r},{data:s}]=await Promise.all([
      supabase.from('literal_trash_recommendations').select('*').order('created_at',{ascending:true}),
      supabase.from('literal_trash_wheel_state').select('spin_nonce,selected_nomination_id,started_at,round,status').eq('id',true).maybeSingle()
    ]);
    if(r) setRows(r as Recommendation[]); if(s) setState(s as WheelState);
  }

  useEffect(()=>{
    if(!supabase) return;
    void load();
    const channel=supabase.channel('literal-trash-wheel-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'literal_trash_recommendations'},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'literal_trash_wheel_state'},()=>void load())
      .subscribe();
    return()=>{void supabase?.removeChannel(channel)};
  },[]);

  useEffect(()=>{
    if(state.spin_nonce<=lastNonce.current || !selected || active.length<1) return;
    lastNonce.current=state.spin_nonce;
    const idx=Math.max(0,active.findIndex(r=>r.id===selected.id));
    const slice=360/active.length;
    const target=360*7 + (360-(idx*slice+slice/2));
    setRotation(prev=>prev+target);
  },[state.spin_nonce,selected?.id,active.length]);

  async function submit(){
    setMessage(''); if(!supabase) return;
    if(!name.trim()||!title.trim()){setMessage('Add your name and book title first.');return}
    const {error}=await supabase.from('literal_trash_recommendations').insert({display_name:name.trim(),title:title.trim(),author:author.trim()||null});
    if(error){setMessage(error.message);return}
    setTitle('');setAuthor('');setMessage('Added to the wheel. Everyone can see it live.');
  }

  async function spin(){
    setAdminMessage(''); if(!supabase) return;
    const {error}=await supabase.rpc('literal_trash_admin_spin_wheel',{admin_password:adminPassword});
    if(error) setAdminMessage(error.message); else setAdminMessage('Spinning live for everyone.');
  }

  async function reset(){
    if(!supabase) return; if(!window.confirm('Clear all recommendations and start a brand-new wheel?')) return;
    const {error}=await supabase.rpc('literal_trash_admin_reset_wheel',{admin_password:adminPassword});
    setAdminMessage(error?error.message:'Wheel reset. Ready for new recommendations.');
  }

  const gradient=active.length ? `conic-gradient(${active.map((_,i)=>`${wheelColors[i%wheelColors.length]} ${i*100/active.length}% ${(i+1)*100/active.length}%`).join(',')})` : 'linear-gradient(145deg,#dceaff,#f7fbff)';

  return <section className="section" id="next-pick">
    <div className="sectionHead"><div><div className="eyebrow">Next book chaos</div><h3>What should we read next?</h3></div><span className="pill"><Sparkles size={15}/> Live elimination wheel</span></div>
    <div className="glass recSubmit">
      <div><h4>Throw a book in the ring.</h4><p className="muted">Everyone can submit a recommendation. When it is time to choose, the whole club can watch the same wheel spin live.</p></div>
      <div className="recFields"><input className="field" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/><input className="field" placeholder="Book title" value={title} onChange={e=>setTitle(e.target.value)}/><input className="field" placeholder="Author (optional)" value={author} onChange={e=>setAuthor(e.target.value)}/><button className="btn" onClick={()=>void submit()}>Add to the wheel</button>{message?<p className="muted recMessage">{message}</p>:null}</div>
    </div>

    <div className="glass wheelStage">
      <div className="wheelSide">
        <div className="wheelPointer">▼</div>
        <div className="wheel" style={{background:gradient,transform:`rotate(${rotation}deg)`}}>
          {active.map((r,i)=>{const angle=(i+.5)*360/active.length;return <div className="wheelLabel" key={r.id} style={{transform:`rotate(${angle}deg) translateY(-43%)`}}><span style={{transform:`rotate(${-angle}deg)`}}>{r.title}</span></div>})}
          <div className="wheelHub">LT</div>
        </div>
        <div className={`wheelResult ${state.status==='winner'?'winner':''}`}>
          {state.status==='winner'&&selected?<><small>WE HAVE A WINNER</small><strong>{selected.title}</strong>{selected.author?<span>{selected.author}</span>:null}</>:selected?<><small>ELIMINATED THIS ROUND</small><strong>{selected.title}</strong><span>Spin again to remove it and keep going.</span></>:<><small>THE WHEEL IS WAITING</small><strong>{active.length} recommendation{active.length===1?'':'s'}</strong></>}
        </div>
      </div>
      <div className="nominationSide"><div className="eyebrow">Still in the running</div><div className="nominationList">{active.map((r,i)=><div className={`nomination ${r.id===selected?.id?'selected':''}`} key={r.id}><i style={{background:wheelColors[i%wheelColors.length]}}/><div><strong>{r.title}</strong><span>{r.author?`${r.author} · `:''}picked by {r.display_name}</span></div></div>)}{!active.length?<p className="muted">No recommendations yet. Be the first.</p>:null}</div>
        <button className="ghost adminToggle" onClick={()=>setAdminOpen(v=>!v)}>Wheel host controls</button>
        {adminOpen?<div className="hostControls"><input className="field" type="password" placeholder="Host password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)}/><button className="btn" onClick={()=>void spin()} disabled={active.length===0}>{selected?'Eliminate + spin again':'Spin the wheel'}</button><button className="ghost" onClick={()=>void reset()}>Reset wheel</button>{adminMessage?<p className="muted">{adminMessage}</p>:null}</div>:null}
      </div>
    </div>
  </section>
}
