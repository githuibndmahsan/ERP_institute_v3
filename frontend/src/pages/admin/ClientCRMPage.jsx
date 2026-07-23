import { useEffect, useMemo, useState } from "react";
import { BellRing, CalendarClock, CheckCircle2, Mail, MessageSquareText, Phone, Plus, Search, UsersRound } from "lucide-react";
import { api } from "../../services/api";

const emptyInquiry = { institutionName:"", institutionType:"School", contactName:"", designation:"", email:"", phone:"", alternatePhone:"", city:"", address:"", website:"", expectedStudents:"", message:"", source:"ERP Website", priority:"MEDIUM", assignedTo:"", followUpAt:"" };
const emptyActivity = { type:"NOTE", subject:"", details:"", performedBy:"", activityAt:"" };
const emptyNotice = { title:"", message:"", severity:"INFO", publishAt:"", expiresAt:"", isBroadcast:true, institutionIds:[] };
const statuses = ["NEW","CONTACTED","QUALIFIED","CONVERTED","CLOSED"];
const priorities = ["LOW","MEDIUM","HIGH","URGENT"];
const moneylessDate = value => value ? new Date(value).toLocaleString() : "—";

export function ClientCRMPage(){
  const [summary,setSummary]=useState({});
  const [data,setData]=useState({items:[],page:1,totalPages:1,total:0});
  const [filters,setFilters]=useState({search:"",status:"",priority:"",page:1,limit:10});
  const [institutions,setInstitutions]=useState([]);
  const [notices,setNotices]=useState([]);
  const [selected,setSelected]=useState(null);
  const [inquiryOpen,setInquiryOpen]=useState(false);
  const [activityOpen,setActivityOpen]=useState(false);
  const [noticeOpen,setNoticeOpen]=useState(false);
  const [form,setForm]=useState(emptyInquiry);
  const [activity,setActivity]=useState(emptyActivity);
  const [notice,setNotice]=useState(emptyNotice);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  async function load(){
    try{
      const [s,i,n,inst]=await Promise.all([
        api.get("/platform/crm/summary"),
        api.get("/platform/crm/inquiries",{params:filters}),
        api.get("/platform/crm/notices"),
        api.get("/platform/institutions",{params:{limit:100}})
      ]);
      setSummary(s.data.data); setData(i.data.data); setNotices(n.data.data); setInstitutions(inst.data.data.items||[]); setError("");
    }catch(e){ setError(e.response?.data?.message||"Unable to load Client CRM."); }
  }

  useEffect(()=>{ const t=setTimeout(load,180); return()=>clearTimeout(t); },[filters.search,filters.status,filters.priority,filters.page]);

  async function openDetails(id){
    try{ const r=await api.get(`/platform/crm/inquiries/${id}`); setSelected(r.data.data); }
    catch(e){setError(e.response?.data?.message||"Unable to load inquiry.");}
  }

  async function createInquiry(e){e.preventDefault();try{await api.post("/platform/crm/inquiries",form);setInquiryOpen(false);setForm(emptyInquiry);setMessage("Inquiry created.");load();}catch(err){setError(err.response?.data?.message||"Unable to create inquiry.");}}
  async function changeStatus(item,status){try{await api.put(`/platform/crm/inquiries/${item.id}`,{status});setMessage(`Lead status changed to ${status}.`);load();if(selected?.id===item.id)openDetails(item.id);}catch(e){setError(e.response?.data?.message||"Unable to change status.");}}
  async function addActivity(e){e.preventDefault();try{await api.post(`/platform/crm/inquiries/${selected.id}/activities`,activity);setActivity(emptyActivity);setActivityOpen(false);setMessage("Activity logged.");openDetails(selected.id);load();}catch(err){setError(err.response?.data?.message||"Unable to add activity.");}}
  async function convert(item){try{await api.post(`/platform/crm/inquiries/${item.id}/convert`,{});setMessage("Lead marked as converted.");load();if(selected?.id===item.id)openDetails(item.id);}catch(e){setError(e.response?.data?.message||"Unable to convert lead.");}}
  async function createNotice(e){e.preventDefault();try{await api.post("/platform/crm/notices",notice);setNoticeOpen(false);setNotice(emptyNotice);setMessage("Global notification published.");load();}catch(err){setError(err.response?.data?.message||"Unable to publish notice.");}}
  async function deleteNotice(id){if(!confirm("Delete this global notice?"))return;await api.delete(`/platform/crm/notices/${id}`);load();}

  const overdue = useMemo(()=>data.items.filter(x=>x.followUpAt&&new Date(x.followUpAt)<new Date()&&!['CONVERTED','CLOSED'].includes(x.status)).length,[data.items]);

  return <>
    <div className="page-head"><div><h1>Client CRM & Communication</h1><p>Website inquiries, sales follow-ups, contact history and global notifications.</p></div><div className="crm-head-actions"><button onClick={()=>setNoticeOpen(true)}><BellRing size={16}/> Broadcast Notice</button><button className="primary" onClick={()=>setInquiryOpen(true)}><Plus size={16}/> Add Inquiry</button></div></div>
    {message&&<div className="success-message">{message}</div>}{error&&<div className="error">{error}</div>}
    <div className="crm-stats"><article><UsersRound/><span>Total Inquiries</span><strong>{summary.total||0}</strong></article><article><Mail/><span>New Leads</span><strong>{summary.newLeads||0}</strong></article><article><CheckCircle2/><span>Qualified</span><strong>{summary.qualified||0}</strong></article><article><MessageSquareText/><span>Converted</span><strong>{summary.converted||0}</strong></article><article><CalendarClock/><span>Overdue Follow-ups</span><strong>{summary.overdueFollowUps||overdue}</strong></article><article><BellRing/><span>Active Notices</span><strong>{summary.activeNotices||0}</strong></article></div>

    <div className="filters institutions-filters"><div className="filter-search"><Search size={17}/><input placeholder="Search institute, contact, email, phone or city" value={filters.search} onChange={e=>setFilters(x=>({...x,search:e.target.value,page:1}))}/></div><select value={filters.status} onChange={e=>setFilters(x=>({...x,status:e.target.value,page:1}))}><option value="">All statuses</option>{statuses.map(x=><option key={x}>{x}</option>)}</select><select value={filters.priority} onChange={e=>setFilters(x=>({...x,priority:e.target.value,page:1}))}><option value="">All priorities</option>{priorities.map(x=><option key={x}>{x}</option>)}</select></div>

    <div className="crm-layout">
      <div className="panel table-wrap"><table><thead><tr><th>Institution / Contact</th><th>Communication</th><th>Source</th><th>Follow-up</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.items.map(i=><tr key={i.id}><td><button className="crm-name" onClick={()=>openDetails(i.id)}>{i.institutionName}</button><small>{i.contactName}{i.designation?` · ${i.designation}`:""} · {i.city||"No city"}</small></td><td>{i.email||"—"}<small>{i.phone||"No phone"}</small></td><td>{i.source||"Manual"}<small>{i.institutionType||"Institution"}</small></td><td className={i.followUpAt&&new Date(i.followUpAt)<new Date()&&!['CONVERTED','CLOSED'].includes(i.status)?"crm-overdue":""}>{moneylessDate(i.followUpAt)}<small>{i.assignedTo||"Unassigned"}</small></td><td><span className={`badge priority-${i.priority.toLowerCase()}`}>{i.priority}</span></td><td><select value={i.status} onChange={e=>changeStatus(i,e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></td><td><div className="row-actions"><button onClick={()=>openDetails(i.id)}>View</button>{!['CONVERTED','CLOSED'].includes(i.status)&&<button onClick={()=>convert(i)}>Convert</button>}</div></td></tr>)}{!data.items.length&&<tr><td colSpan="7" className="empty-cell">No CRM inquiries found.</td></tr>}</tbody></table><div className="pagination"><button disabled={data.page<=1} onClick={()=>setFilters(x=>({...x,page:x.page-1}))}>Previous</button><span>Page {data.page} of {data.totalPages} · {data.total} inquiries</span><button disabled={data.page>=data.totalPages} onClick={()=>setFilters(x=>({...x,page:x.page+1}))}>Next</button></div></div>

      <aside className="panel notice-panel"><div className="notice-panel-head"><div><h2>Global Notifications</h2><p>Broadcast updates to Institute Admins.</p></div><button onClick={()=>setNoticeOpen(true)}>+</button></div><div className="notice-list">{notices.slice(0,8).map(n=><article key={n.id} className={`notice-item ${n.severity.toLowerCase()}`}><div><span>{n.severity}</span><button onClick={()=>deleteNotice(n.id)}>×</button></div><h3>{n.title}</h3><p>{n.message}</p><small>{moneylessDate(n.publishAt)} · {n.isBroadcast?"All institutions":`${n.recipients.length} recipients`}</small></article>)}{!notices.length&&<p className="muted">No global notices.</p>}</div></aside>
    </div>

    {selected&&<div className="modal-bg"><div className="modal crm-detail-modal"><div className="modal-head"><div><h2>{selected.institutionName}</h2><p>{selected.contactName} · {selected.email||selected.phone||"No contact"}</p></div><button onClick={()=>setSelected(null)}>×</button></div><div className="crm-detail-grid"><section><h3>Lead Profile</h3><dl><div><dt>Status</dt><dd>{selected.status}</dd></div><div><dt>Priority</dt><dd>{selected.priority}</dd></div><div><dt>Institution Type</dt><dd>{selected.institutionType||"—"}</dd></div><div><dt>Expected Students</dt><dd>{selected.expectedStudents||"—"}</dd></div><div><dt>Phone</dt><dd>{selected.phone||"—"}</dd></div><div><dt>Email</dt><dd>{selected.email||"—"}</dd></div><div><dt>Website</dt><dd>{selected.website||"—"}</dd></div><div><dt>Follow-up</dt><dd>{moneylessDate(selected.followUpAt)}</dd></div></dl><p className="crm-message">{selected.message||"No inquiry message."}</p><div className="crm-detail-actions"><button onClick={()=>setActivityOpen(true)}><Plus size={15}/> Add Activity</button>{!['CONVERTED','CLOSED'].includes(selected.status)&&<button className="primary" onClick={()=>convert(selected)}>Convert Lead</button>}</div></section><section><h3>Contact & Activity Log</h3><div className="activity-list">{selected.activities.map(a=><article key={a.id}><div><b>{a.type}</b><span>{moneylessDate(a.activityAt)}</span></div><h4>{a.subject||"Activity"}</h4><p>{a.details}</p><small>{a.performedBy||"Platform user"}</small></article>)}{!selected.activities.length&&<p>No activities logged.</p>}</div></section></div></div></div>}

    {inquiryOpen&&<div className="modal-bg"><div className="modal"><div className="modal-head"><div><h2>Add Client Inquiry</h2><p>Record a lead from the ERP website, email, phone or referral.</p></div><button onClick={()=>setInquiryOpen(false)}>×</button></div><form className="form-grid" onSubmit={createInquiry}>{[["institutionName","Institution Name","text"],["institutionType","Institution Type","text"],["contactName","Contact Name","text"],["designation","Designation","text"],["email","Email","email"],["phone","Primary Phone","text"],["alternatePhone","Secondary Phone","text"],["city","City","text"],["website","Website","text"],["expectedStudents","Expected Students","number"],["source","Lead Source","text"],["assignedTo","Assigned To","text"],["followUpAt","Follow-up Date","datetime-local"]].map(([k,l,t])=><label key={k}>{l}<input required={["institutionName","contactName"].includes(k)} type={t} value={form[k]} onChange={e=>setForm(x=>({...x,[k]:e.target.value}))}/></label>)}<label>Priority<select value={form.priority} onChange={e=>setForm(x=>({...x,priority:e.target.value}))}>{priorities.map(x=><option key={x}>{x}</option>)}</select></label><label className="span2">Address<input value={form.address} onChange={e=>setForm(x=>({...x,address:e.target.value}))}/></label><label className="span2">Message<textarea value={form.message} onChange={e=>setForm(x=>({...x,message:e.target.value}))}/></label><div className="modal-actions"><button type="button" onClick={()=>setInquiryOpen(false)}>Cancel</button><button className="primary">Save Inquiry</button></div></form></div></div>}

    {activityOpen&&selected&&<div className="modal-bg"><div className="modal payment-modal"><div className="modal-head"><div><h2>Add CRM Activity</h2><p>{selected.institutionName}</p></div><button onClick={()=>setActivityOpen(false)}>×</button></div><form className="form-grid" onSubmit={addActivity}><label>Activity Type<select value={activity.type} onChange={e=>setActivity(x=>({...x,type:e.target.value}))}>{["NOTE","EMAIL","CALL","MEETING","FOLLOW_UP","STATUS_CHANGE"].map(x=><option key={x}>{x}</option>)}</select></label><label>Subject<input value={activity.subject} onChange={e=>setActivity(x=>({...x,subject:e.target.value}))}/></label><label>Performed By<input value={activity.performedBy} onChange={e=>setActivity(x=>({...x,performedBy:e.target.value}))}/></label><label>Activity Date<input type="datetime-local" value={activity.activityAt} onChange={e=>setActivity(x=>({...x,activityAt:e.target.value}))}/></label><label className="span2">Details<textarea required value={activity.details} onChange={e=>setActivity(x=>({...x,details:e.target.value}))}/></label><div className="modal-actions"><button type="button" onClick={()=>setActivityOpen(false)}>Cancel</button><button className="primary">Save Activity</button></div></form></div></div>}

    {noticeOpen&&<div className="modal-bg"><div className="modal payment-modal"><div className="modal-head"><div><h2>Global Notification</h2><p>Send a platform update or maintenance alert.</p></div><button onClick={()=>setNoticeOpen(false)}>×</button></div><form className="form-grid" onSubmit={createNotice}><label>Title<input required value={notice.title} onChange={e=>setNotice(x=>({...x,title:e.target.value}))}/></label><label>Severity<select value={notice.severity} onChange={e=>setNotice(x=>({...x,severity:e.target.value}))}>{["INFO","SUCCESS","WARNING","CRITICAL"].map(x=><option key={x}>{x}</option>)}</select></label><label>Publish At<input type="datetime-local" value={notice.publishAt} onChange={e=>setNotice(x=>({...x,publishAt:e.target.value}))}/></label><label>Expires At<input type="datetime-local" value={notice.expiresAt} onChange={e=>setNotice(x=>({...x,expiresAt:e.target.value}))}/></label><label className="checkbox-label"><input type="checkbox" checked={notice.isBroadcast} onChange={e=>setNotice(x=>({...x,isBroadcast:e.target.checked,institutionIds:[]}))}/> Broadcast to all active institutions</label>{!notice.isBroadcast&&<label className="span2">Select Institutions<select multiple value={notice.institutionIds.map(String)} onChange={e=>setNotice(x=>({...x,institutionIds:Array.from(e.target.selectedOptions,v=>Number(v.value))}))}>{institutions.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>}<label className="span2">Message<textarea required value={notice.message} onChange={e=>setNotice(x=>({...x,message:e.target.value}))}/></label><div className="modal-actions"><button type="button" onClick={()=>setNoticeOpen(false)}>Cancel</button><button className="primary">Publish Notice</button></div></form></div></div>}
  </>;
}
