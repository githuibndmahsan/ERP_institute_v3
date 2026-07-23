import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Eye, Pencil, Plus, Search, ShieldAlert } from "lucide-react";
import { api } from "../../services/api";

const empty = {
  name: "", code: "", tenantKey: "", subdomain: "", officialEmail: "", billingEmail: "",
  primaryPhone: "", secondaryPhone: "", contactPersonName: "", contactPersonTitle: "",
  city: "", address: "", adminName: "", adminUsername: "", adminEmail: "", adminPassword: "",
  planId: "", customPrice: "", concessionAmount: "0"
};

function slugify(value = "") {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function InstitutionsPage() {
  const [data, setData] = useState({ items: [], page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: "", status: "", page: 1, limit: 25 });
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [institutionsResponse, plansResponse] = await Promise.all([
        api.get("/platform/institutions", { params: filters }),
        api.get("/platform/plans")
      ]);
      setData(institutionsResponse.data.data);
      setPlans(plansResponse.data.data);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load institutions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 220);
    return () => clearTimeout(timer);
  }, [filters.search, filters.status, filters.page, filters.limit]);

  const summary = useMemo(() => ({
    active: data.items.filter((item) => item.status === "ACTIVE").length,
    suspended: data.items.filter((item) => item.status === "SUSPENDED").length,
    maintenance: data.items.filter((item) => item.status === "MAINTENANCE").length
  }), [data.items]);

  function setField(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "name") {
        const tenant = slugify(value);
        if (!current.code) next.code = value.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 8);
        if (!current.tenantKey) next.tenantKey = tenant;
        if (!current.subdomain) next.subdomain = tenant ? `${tenant}.your-erp.com` : "";
        if (!current.adminUsername) next.adminUsername = tenant ? `${tenant}-admin` : "";
      }
      return next;
    });
  }

  async function save(event) {
    event.preventDefault();
    setMessage("");
    try {
      await api.post("/platform/institutions", form);
      setOpen(false);
      setForm(empty);
      setMessage("Institution, tenant, administrator and subscription created successfully.");
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create institution.");
    }
  }

  async function updateStatus(id, status) {
    const reason = status === "SUSPENDED" ? window.prompt("Suspension reason:", "Subscription or administrative hold") : "";
    if (status === "SUSPENDED" && reason === null) return;
    try {
      await api.patch(`/platform/institutions/${id}/status`, { status, reason });
      setMessage(`Institution status changed to ${status}.`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update status.");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Registered Institutions</h1>
          <p>Onboard and manage tenants, contacts, domains, subscriptions and platform access.</p>
        </div>
        <button className="primary" onClick={() => { setForm(empty); setOpen(true); }}><Plus size={17}/> Add Institution</button>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="institution-summary-grid">
        <article><Building2/><span>Total Registered</span><strong>{data.total}</strong></article>
        <article><Building2/><span>Active on page</span><strong>{summary.active}</strong></article>
        <article><ShieldAlert/><span>Suspended on page</span><strong>{summary.suspended}</strong></article>
        <article><ShieldAlert/><span>Maintenance on page</span><strong>{summary.maintenance}</strong></article>
      </div>

      <div className="filters institutions-filters">
        <div className="filter-search"><Search size={17}/><input placeholder="Search name, code, email or phone" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}/></div>
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}>
          <option value="">All statuses</option><option>ACTIVE</option><option>SUSPENDED</option><option>MAINTENANCE</option>
        </select>
        <select value={filters.limit} onChange={(event) => setFilters((current) => ({ ...current, limit: Number(event.target.value), page: 1 }))}>
          <option value="10">10 per page</option><option value="25">25 per page</option><option value="50">50 per page</option>
        </select>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Institution</th><th>Contacts</th><th>Tenant / Domain</th><th>Subscription</th><th>Platform Records</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {data.items.map((institution) => (
              <tr key={institution.id}>
                <td><b>{institution.name}</b><small>{institution.code} · ID #{institution.id}</small></td>
                <td>{institution.officialEmail || "—"}<small>{institution.primaryPhone || "No phone"} · {institution.contactPersonName || "No contact person"}</small></td>
                <td>{institution.subdomain}<small>{institution.customDomain || institution.tenantKey}</small></td>
                <td>{institution.subscriptions[0]?.plan?.name || "No plan"}<small>{institution.subscriptions[0]?.status || "Not subscribed"}</small></td>
                <td>{institution._count.users} users<small>{institution._count.invoices} invoices</small></td>
                <td><span className={`badge ${institution.status.toLowerCase()}`}>{institution.status}</span></td>
                <td>
                  <div className="institution-actions">
                    <Link className="icon-action" title="View profile" to={`/super-admin/institutions/${institution.id}`}><Eye size={16}/></Link>
                    <Link className="icon-action" title="Edit institution" to={`/super-admin/institutions/${institution.id}?edit=1`}><Pencil size={16}/></Link>
                    <select aria-label="Change institution status" value={institution.status} onChange={(event) => updateStatus(institution.id, event.target.value)}>
                      <option>ACTIVE</option><option>SUSPENDED</option><option>MAINTENANCE</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !data.items.length && <tr><td colSpan="7" className="empty-cell">No registered institutions found.</td></tr>}
            {loading && <tr><td colSpan="7" className="empty-cell">Loading institutions...</td></tr>}
          </tbody>
        </table>
        <div className="pagination">
          <button disabled={data.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: data.page - 1 }))}>Previous</button>
          <span>Page {data.page} of {data.totalPages} · {data.total} institutions</span>
          <button disabled={data.page >= data.totalPages} onClick={() => setFilters((current) => ({ ...current, page: data.page + 1 }))}>Next</button>
        </div>
      </div>

      {open && <div className="modal-bg"><div className="modal institution-modal">
        <div className="modal-head"><div><h2>Onboard Institution</h2><p>Create tenant, subdomain, administrator and SaaS subscription.</p></div><button onClick={() => setOpen(false)}>×</button></div>
        <form className="form-grid" onSubmit={save}>
          {[
            ["name","Institution Name"],["code","Institution Code"],["tenantKey","Tenant Key"],["subdomain","Subdomain"],
            ["officialEmail","Official Email","email"],["billingEmail","Billing Email","email"],["primaryPhone","Primary Phone"],["secondaryPhone","Secondary Phone"],
            ["contactPersonName","Primary Contact"],["contactPersonTitle","Contact Designation"],["city","City"],["address","Full Address"],
            ["adminName","Administrator Name"],["adminUsername","Administrator Username"],["adminEmail","Administrator Email","email"],["adminPassword","Temporary Password","password"],
            ["customPrice","Custom Subscription Price","number"],["concessionAmount","Concession Amount","number"]
          ].map(([key,label,type="text"]) => <label key={key}>{label}<input type={type} required={["name","code","tenantKey","subdomain","adminName","adminUsername","adminEmail","adminPassword"].includes(key)} value={form[key]} onChange={(event) => setField(key,event.target.value)}/></label>)}
          <label>Subscription Plan<select required value={form.planId} onChange={(event) => setField("planId",event.target.value)}><option value="">Select plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — PKR {Number(plan.basePrice).toLocaleString()} / {plan.billingCycle.toLowerCase()}</option>)}</select></label>
          <div className="modal-actions"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary">Create Institution</button></div>
        </form>
      </div></div>}
    </>
  );
}
