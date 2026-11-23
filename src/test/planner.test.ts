import { describe,it,expect } from 'vitest';
import { generatePlan, nextRevisionInterval } from '@/lib/planner/engine';
import { validateSchedule } from '@/lib/planner/validation';
import { analytics } from '@/lib/planner/analytics';
import { buildDemo, demoProfile } from '@/lib/planner/demo';
import { useStore } from '@/lib/store';
import type { Profile, Subject, StudySession } from '@/lib/planner/types';
const profile:Profile={name:'Student',college:'College',degree:'BTech',branch:'CS',year:'2',semester:'3',hoursPerDay:2,prefTime:'evening',maxSessionsPerDay:2,goals:'Prepare for exams',level:'beginner'};
const subjects:Subject[]=[{id:'dbms',name:'DBMS',code:'CS',examDate:'2026-11-27',difficulty:4,importance:5,color:1,chapters:[{id:'unit',name:'Relational model',topics:[{id:'sql',name:'SQL',difficulty:4,estMinutes:180,spentMinutes:0,status:'not_started',confidence:0,needsRevision:false,revisions:[]},{id:'joins',name:'Joins',difficulty:3,estMinutes:90,spentMinutes:0,status:'not_started',confidence:0,needsRevision:false,revisions:[]}]}]}];
const s:StudySession={id:'s',subjectId:'dbms',topicId:'sql',title:'SQL',description:'Learn SQL',date:'2026-11-20',start:'17:00',duration:90,priority:'high',type:'learn',status:'planned'};
describe('Student planning rules',()=>{
 it('respects two available hours per day',()=>{const plan=generatePlan(subjects,profile,[],'2026-11-20',7);expect(plan.length).toBeGreaterThan(0);for(const date of new Set(plan.map(s=>s.date)))expect(plan.filter(s=>s.date===date).reduce((a,s)=>a+s.duration,0)).toBeLessThanOrEqual(120);});
 it('respects two sessions per day',()=>{const plan=generatePlan(subjects,profile,[],'2026-11-20',7);for(const date of new Set(plan.map(s=>s.date)))expect(plan.filter(s=>s.date===date).length).toBeLessThanOrEqual(2);});
 it('reserves the day before exams for mock and revision only',()=>{const plan=generatePlan(subjects,profile,[],'2026-11-20',7);const buffer=plan.filter(s=>s.date==='2026-11-26');expect(buffer.length).toBeGreaterThan(0);expect(buffer.every(s=>s.type==='mock'||s.type==='revise')).toBe(true);});
 it('keeps a seven-day plan inside seven days',()=>{const plan=generatePlan(subjects,profile,[],'2026-11-20',7);expect(plan.every(s=>s.date>='2026-11-20'&&s.date<='2026-11-26')).toBe(true);});
 it('rejects overlapping study blocks',()=>expect(validateSchedule([{...s,id:'second',start:'17:30',duration:30}],[s],profile,subjects)).toContain('overlap'));
 it('rejects AI proposals that overload a day',()=>expect(validateSchedule([{...s,id:'second',start:'19:00',duration:90}],[s],profile,subjects)).toContain('2 study hours'));
 it('rejects unknown syllabus topics',()=>expect(validateSchedule([{...s,topicId:'unknown'}],[],profile,subjects)).toContain('topic'));
 it('never studies after the exam',()=>expect(validateSchedule([{...s,date:'2026-11-27'}],[],profile,subjects)).toContain('before'));
 it('revision intervals shrink for low confidence',()=>expect(nextRevisionInterval(1,4,2)).toBeLessThan(nextRevisionInterval(5,4,2)));
 it('analytics use actual study minutes',()=>{const a=analytics(subjects,[{...s,status:'done',actualMinutes:35}],'2026-11-20');expect(a.week.at(-1)?.actual).toBe(35);expect(a.adherence).toBe(100);});
 it('schedule proposals need approval and cannot apply twice',()=>{useStore.setState({profile,subjects,sessions:[],adjustments:[]});const a={id:'proposal',createdAt:'2026-11-20',kind:'assistant' as const,title:'Plan',reason:'Exam preparation',changes:[],status:'proposed' as const,add:[s],remove:[]};useStore.getState().propose(a);expect(useStore.getState().sessions).toHaveLength(0);useStore.getState().applyAdjustment(a.id);useStore.getState().applyAdjustment(a.id);expect(useStore.getState().sessions).toHaveLength(1);});
 it('removing a chapter removes its sessions',()=>{useStore.setState({subjects,sessions:[s]});useStore.getState().deleteChapter('dbms','unit');expect(useStore.getState().subjects[0]?.chapters).toHaveLength(0);expect(useStore.getState().sessions).toHaveLength(0);});
});
describe('Aarav demo learning workspace',()=>{
 const demo=buildDemo();
 const topic=(name:string)=>demo.subjects.flatMap(s=>s.chapters.flatMap(c=>c.topics)).find(t=>t.name===name);
 it('includes the five requested semester subjects and profile',()=>{
  expect(demoProfile).toMatchObject({name:'Aarav Sharma',degree:'B.Tech',branch:'Computer Science & Engineering',semester:'5'});
  expect(demo.subjects.map(s=>s.name)).toEqual(['Database Management Systems','Operating Systems','Computer Networks','Artificial Intelligence','Discrete Mathematics']);
 });
 it('seeds mastered, developing, and revision-due topics with assessment history',()=>{
  expect(topic('SQL Joins & Queries')).toMatchObject({status:'done',confidence:5});
  expect(topic('Normalization')).toMatchObject({needsRevision:true,confidence:1});
  expect(topic('Indexing')?.status).toBe('learning');
  expect(topic('Semaphores & mutex')?.status).toBe('learning');
  expect(topic('Virtual Memory')?.status).toBe('learning');
  expect(topic('Routing algorithms')?.status).toBe('learning');
  expect(demo.attempts.map(a=>a.accuracy)).toEqual([80,40,60,100]);
 });
});
