import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { LovableMark } from '@lovable.dev/cloud-auth-js/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
export function AccountForm() {
 const [mode,setMode]=useState<'signin'|'signup'|'reset'>('signup'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const social=async(provider:'google'|'lovable')=>{setBusy(true);setMessage('');try { const r=await lovable.auth.signInWithOAuth(provider,{redirect_uri:window.location.origin});if(r.error)setMessage(r.error.message);}catch(e){setMessage(e instanceof Error?e.message:'Sign-in failed.');}finally{setBusy(false);}};
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{
  if(mode==='reset'){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset-password'});if(error)throw error;setMessage('Check your email for a password reset link.');}
  else if(mode==='signup'){const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});if(error)throw error;if(!data.session)setMessage('Check your email to confirm your account, then sign in.');}
  else {const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
 }catch(e){setMessage(e instanceof Error?e.message:'Could not sign in.');}finally{setBusy(false);}};
 return <div className="mx-auto w-full max-w-sm"><h2 className="text-xl font-semibold">{mode==='signup'?'Create your student account':mode==='reset'?'Reset your password':'Welcome back'}</h2>
 <div className="mt-5 grid gap-2"><Button variant="outline" className="google-signin" disabled={busy} onClick={()=>social('google')}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>Continue with Google</Button><Button variant="outline" disabled={busy} onClick={()=>social('lovable')}><LovableMark/>Continue with Lovable</Button></div>
 <form onSubmit={submit} className="mt-5 space-y-4"><div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></div>{mode!=='reset'&&<div><Label htmlFor="password">Password</Label><Input id="password" type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signup'?'new-password':'current-password'}/></div>}{message&&<p role="status" className="text-sm text-muted-foreground">{message}</p>}<Button disabled={busy} className="w-full" type="submit">{busy?'Please wait…':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Sign in'}</Button></form>
 <div className="mt-3 flex flex-wrap justify-between"><Button variant="link" size="sm" onClick={()=>{setMode(mode==='signup'?'signin':'signup');setMessage('');}}>{mode==='signup'?'Already have an account? Sign in':'Create an account'}</Button><Button variant="link" size="sm" onClick={()=>setMode('reset')}>Forgot password?</Button></div></div>;
}
