import { Building2, CreditCard, Gauge, LogOut, Mail, Settings, ShieldCheck, Users, GraduationCap, CalendarCheck, ClipboardCheck, FileText, Globe2 } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const platform = [["/super-admin","Dashboard",Gauge],["/super-admin/institutions","Institutions",Building2],["/super-admin/billing","Billing",CreditCard],["/super-admin/crm","Client CRM",Mail],["/super-admin/users","Users & Permissions",ShieldCheck],["/super-admin/reports","Reports",FileText],["/super-admin/settings","Settings",Settings]];
const institute = [["/dashboard","Dashboard",Gauge],["/students","Students",GraduationCap],["/attendance","Attendance",CalendarCheck],["/fees","Fees",CreditCard],["/exams","Exams / Results",ClipboardCheck],["/result-cards","Result Cards",FileText],["/ptm","PTM Schedules",Users],["/settings/website","Website Studio",Globe2],["/users","Users & Permissions",ShieldCheck],["/settings","Settings",Settings]];
export function AppLayout() {
 const { user, logout } = useAuth(); const navigate = useNavigate(); const nav = user?.role === "SUPER_ADMIN" ? platform : institute;
 return <div className="shell"><aside><div className="brand"><span>E</span><div><strong>Enterprise ERP</strong><small>{user?.role === "SUPER_ADMIN" ? "Platform Control" : user?.institution?.name}</small></div></div><nav>{nav.map(([to,label,Icon])=><NavLink end={to==="/super-admin"||to==="/dashboard"} key={to} to={to}><Icon size={18}/>{label}</NavLink>)}</nav><button className="logout" onClick={()=>{logout();navigate('/login')}}><LogOut size={18}/>Logout</button></aside><main><header><div><strong>{user?.name}</strong><small>{user?.role.replaceAll('_',' ')}</small></div></header><section className="content"><Outlet/></section></main></div>;
}
