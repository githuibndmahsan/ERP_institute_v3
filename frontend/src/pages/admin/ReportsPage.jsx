import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import {
  Building2, CircleDollarSign, Download, FileBarChart2, Filter,
  Percent, ReceiptText, Users, WalletCards
} from "lucide-react";
import { api } from "../../services/api";

const money = (value) => `PKR ${Number(value || 0).toLocaleString()}`;
const dateValue = (date) => date.toISOString().slice(0, 10);
const palette = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#64748b"];

function Stat({ icon: Icon, label, value, hint }) {
  return <article className="report-stat"><span><Icon size={19}/></span><div><small>{label}</small><strong>{value}</strong>{hint&&<p>{hint}</p>}</div></article>;
}

export function ReportsPage() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const [filters, setFilters] = useState({ from: dateValue(start), to: dateValue(now) });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await api.get("/platform/reports/summary", { params: filters });
      setData(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load reports.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function exportReport(type) {
    setExporting(type); setError("");
    try {
      const response = await api.get(`/platform/reports/export/${type}`, { params: filters, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${type}-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to export ${type}.`);
    } finally { setExporting(""); }
  }

  const monthlyRevenue = useMemo(() => data?.monthlyRevenue || [], [data]);
  const k = data?.kpis || {};

  return <div className="reports-page">
    <div className="page-head">
      <div><h1>Platform Reports</h1><p>Institutions, subscriptions, billing, CRM, users and revenue performance.</p></div>
      <button className="primary" onClick={load} disabled={loading}><Filter size={16}/>{loading?"Refreshing...":"Apply Range"}</button>
    </div>

    <div className="report-filter panel">
      <label>From<input type="date" value={filters.from} onChange={e=>setFilters(x=>({...x,from:e.target.value}))}/></label>
      <label>To<input type="date" value={filters.to} onChange={e=>setFilters(x=>({...x,to:e.target.value}))}/></label>
      <span>Report period controls billing, payments and CRM metrics.</span>
    </div>

    {error&&<div className="error">{error}</div>}
    {loading&&!data?<div className="panel empty"><h2>Loading platform reports...</h2></div>:null}

    {data&&<>
      <div className="report-stat-grid">
        <Stat icon={Building2} label="Institutions" value={k.totalInstitutions||0} hint={`${k.activeInstitutions||0} active`}/>
        <Stat icon={ReceiptText} label="Total Billed" value={money(k.billed)}/>
        <Stat icon={WalletCards} label="Collected" value={money(k.collected)}/>
        <Stat icon={CircleDollarSign} label="Outstanding" value={money(k.outstanding)}/>
        <Stat icon={Percent} label="Concessions" value={money(k.concessions)}/>
        <Stat icon={Users} label="Platform Users" value={k.users||0}/>
      </div>

      <div className="report-charts-grid">
        <section className="panel report-chart-card"><div className="report-card-head"><div><h2>Monthly Revenue</h2><p>Payments received during the selected period.</p></div></div><div className="report-chart">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyRevenue}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis tickFormatter={v=>`${Math.round(v/1000)}k`}/><Tooltip formatter={v=>money(v)}/><Area type="monotone" dataKey="amount" stroke="#2563eb" fill="url(#revenueFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer>
        </div></section>

        <section className="panel report-chart-card"><div className="report-card-head"><div><h2>Invoice Status</h2><p>Invoice count by current collection status.</p></div></div><div className="report-chart">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.invoiceStatuses}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="count" radius={[6,6,0,0]}>{data.invoiceStatuses.map((_,i)=><Cell key={i} fill={palette[i%palette.length]}/>)}</Bar></BarChart></ResponsiveContainer>
        </div></section>

        <section className="panel report-chart-card"><div className="report-card-head"><div><h2>Institution Status</h2><p>Active, suspended and maintenance tenants.</p></div></div><div className="report-chart">
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.institutionStatuses} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={3}>{data.institutionStatuses.map((_,i)=><Cell key={i} fill={palette[i%palette.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>
        </div></section>

        <section className="panel report-chart-card"><div className="report-card-head"><div><h2>CRM Funnel</h2><p>{k.inquiries||0} inquiries · {k.conversionRate||0}% conversion.</p></div></div><div className="report-chart">
          <ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={data.inquiryStatuses}><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="name" width={85}/><Tooltip/><Bar dataKey="value" fill="#7c3aed" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer>
        </div></section>
      </div>

      <section className="panel report-performance">
        <div className="report-card-head"><div><h2>Institution Performance</h2><p>Billing, collection and user activity by institution.</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Institution</th><th>Status</th><th>Users</th><th>Invoices</th><th>Billed</th><th>Collected</th><th>Outstanding</th><th>Collection Rate</th></tr></thead><tbody>
          {data.institutionPerformance.map(item=><tr key={item.id}><td><b>{item.name}</b><small>{item.code}</small></td><td><span className={`badge ${String(item.status).toLowerCase()}`}>{item.status}</span></td><td>{item.users}</td><td>{item.invoiceCount}</td><td>{money(item.billed)}</td><td>{money(item.collected)}</td><td>{money(item.outstanding)}</td><td><b>{item.collectionRate}%</b></td></tr>)}
          {!data.institutionPerformance.length&&<tr><td colSpan="8" className="empty-cell">No institution performance data.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="panel report-exports">
        <div className="report-card-head"><div><h2>Export Reports</h2><p>Download spreadsheet-ready CSV files for further analysis.</p></div></div>
        <div className="report-export-grid">
          {[ ["institutions","Institutions Directory"],["invoices","Billing Invoices"],["payments","Payment History"],["crm","CRM Inquiries"],["users","Users Directory"] ].map(([type,label])=><button key={type} onClick={()=>exportReport(type)} disabled={Boolean(exporting)}><FileBarChart2 size={20}/><span><b>{label}</b><small>{exporting===type?"Preparing download...":"Download CSV"}</small></span><Download size={17}/></button>)}
        </div>
      </section>
    </>}
  </div>;
}
