import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
const AccountContext = createContext<{user:User|null;ready:boolean;sync:string}>({user:null,ready:false,sync:'Loading'});
export const useAccount = () => useContext(AccountContext);
export function CloudWorkspace({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null), [ready,setReady]=useState(false), [sync,setSync]=useState('Saved'), [retry,setRetry]=useState(0), [failed,setFailed]=useState(false);
  useEffect(()=>{
    let alive=true, unsubscribe:(()=>void)|undefined, timer:ReturnType<typeof setTimeout>|undefined, generation=0;
    let queue=Promise.resolve();
    const load=async (u:User|null)=>{
      const current=++generation; unsubscribe?.();clearTimeout(timer);setReady(false);setFailed(false);setUser(u);
      await useStore.persist.rehydrate();
      if (!alive || current!==generation) return;
      if(u){
        const {data,error}=await supabase.from('study_workspaces').select('data').eq('user_id',u.id).maybeSingle();
        if(!alive||current!==generation)return;
        if(error){setSync('Could not load');setFailed(true);return;}
        useStore.getState().reset();
        if(data?.data && typeof data.data==='object' && !Array.isArray(data.data)) useStore.setState({...data.data as object,demo:false});
        const save=()=>{
          const st=useStore.getState();if(st.demo)return;
          const snapshot=JSON.parse(JSON.stringify({profile:st.profile,subjects:st.subjects,sessions:st.sessions,adjustments:st.adjustments,notices:st.notices,theme:st.theme})) as Json;
          setSync('Saving…');clearTimeout(timer);
          timer=setTimeout(()=>{queue=queue.then(async()=>{
            if(!alive||current!==generation)return;
            const {error:e}=await supabase.from('study_workspaces').upsert({user_id:u.id,data:snapshot,updated_at:new Date().toISOString()});
            if(!alive||current!==generation)return;
            setSync(e?'Not saved — retry':'Saved');if(e)toast.error('Your changes could not be saved. Try again in Settings.');
          });},350);
        };
        unsubscribe=useStore.subscribe(save);
      } else if(!useStore.getState().demo) useStore.getState().reset();
      setSync(u?'Saved':'Demo · this browser');setReady(true);
    };
    void supabase.auth.getSession().then(({data})=>load(data.session?.user??null));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED') queueMicrotask(()=>void load(session?.user??null));
    });
    return()=>{alive=false;generation++;unsubscribe?.();clearTimeout(timer);subscription.unsubscribe();};
  },[retry]);
  return <AccountContext.Provider value={{user,ready,sync}}>{failed?<div className="grid min-h-screen place-content-center gap-4 text-center"><p>Your saved study plan could not be loaded.</p><Button onClick={()=>setRetry(r=>r+1)}>Try again</Button></div>:ready?children:<div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Opening your study workspace…</div>}</AccountContext.Provider>;
}
