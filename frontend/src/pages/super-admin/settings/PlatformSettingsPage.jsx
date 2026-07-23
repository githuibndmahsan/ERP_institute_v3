import { useEffect, useState } from "react";
import { platformSettingsApi } from "../../../services/platformSettings";

const tabs = ["Company","Billing","Domains","Email","Security","Backups","Templates","Audit"];

export function PlatformSettingsPage() {
  const [tab, setTab] = useState("Company");
  const [form, setForm] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [audit, setAudit] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [settings, templateRows, auditRows] = await Promise.all([
        platformSettingsApi.get(),
        platformSettingsApi.templates(),
        platformSettingsApi.audit()
      ]);
      setForm(settings);
      setTemplates(templateRows);
      setAudit(auditRows);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load settings.");
    }
  }

  useEffect(() => { load(); }, []);

  const change = (key, value) => setForm((x) => ({ ...x, [key]: value }));

  async function save(e) {
    e.preventDefault();
    try {
      await platformSettingsApi.update(form);
      setMessage("Platform settings saved.");
      setError("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save settings.");
    }
  }

  if (!form) return <div className="page">Loading platform settings...</div>;

  const field = (key, label, type = "text") => (
    <label>{label}
      <input
        type={type}
        value={form[key] ?? ""}
        onChange={(e) => change(key, type === "number" ? Number(e.target.value) : e.target.value)}
      />
    </label>
  );

  const toggle = (key, label) => (
    <label className="settings-toggle">
      <input type="checkbox" checked={Boolean(form[key])}
        onChange={(e) => change(key, e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  return <div className="page">
    <div className="page-heading">
      <div><h1>Platform Settings</h1><p>Global ERP, billing, domains, email and security configuration.</p></div>
      <button className="primary" form="settings-form">Save Changes</button>
    </div>

    {message && <div className="success-message">{message}</div>}
    {error && <div className="error">{error}</div>}

    <div className="settings-tabs">
      {tabs.map((x) => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{x}</button>)}
    </div>

    <form id="settings-form" className="panel settings-panel" onSubmit={save}>
      {tab === "Company" && <div className="settings-grid">
        {field("companyName","Company Name")}
        {field("legalName","Legal Name")}
        {field("supportEmail","Support Email","email")}
        {field("billingEmail","Billing Email","email")}
        {field("supportPhone","Support Phone")}
        {field("secondaryPhone","Secondary Phone")}
        {field("websiteUrl","Website URL")}
        {field("city","City")}
        {field("country","Country")}
        {field("currency","Currency")}
        {field("timezone","Timezone")}
        <label className="settings-full">Address<textarea value={form.address || ""} onChange={(e) => change("address",e.target.value)} /></label>
      </div>}

      {tab === "Billing" && <div className="settings-grid">
        {field("taxName","Tax Name")}
        {field("taxRate","Tax Rate %","number")}
        {field("invoicePrefix","Invoice Prefix")}
        {field("invoiceDueDays","Invoice Due Days","number")}
        {field("gracePeriodDays","Grace Period Days","number")}
        {field("autoSuspendAfterDays","Suspend After Days","number")}
        {field("defaultMonthlyPrice","Default Monthly Price","number")}
        {field("defaultAnnualPrice","Default Annual Price","number")}
        {field("defaultConcession","Default Concession %","number")}
        <label>Billing Cycle<select value={form.defaultBillingCycle} onChange={(e) => change("defaultBillingCycle",e.target.value)}><option>MONTHLY</option><option>ANNUAL</option></select></label>
        {toggle("autoSuspendEnabled","Automatic subscription suspension")}
      </div>}

      {tab === "Domains" && <div className="settings-grid">
        {field("subdomainBase","Base Domain")}
        {toggle("allowCustomDomains","Allow custom institution domains")}
        {toggle("maintenanceMode","Platform maintenance mode")}
        <label className="settings-full">Maintenance Message<textarea value={form.maintenanceMessage || ""} onChange={(e) => change("maintenanceMessage",e.target.value)} /></label>
      </div>}

      {tab === "Email" && <div className="settings-grid">
        {field("emailFromName","Sender Name")}
        {field("emailFromAddress","Sender Email","email")}
        {field("smtpHost","SMTP Host")}
        {field("smtpPort","SMTP Port","number")}
        {field("smtpUsername","SMTP Username")}
        {toggle("smtpSecure","Secure SMTP")}
      </div>}

      {tab === "Security" && <div className="settings-grid">
        {toggle("strongPasswords","Require strong passwords")}
        {field("sessionTimeoutMinutes","Session Timeout","number")}
        {field("maxLoginAttempts","Maximum Login Attempts","number")}
        {field("auditRetentionDays","Audit Retention Days","number")}
      </div>}

      {tab === "Backups" && <div className="settings-grid">
        {toggle("dailyBackupEnabled","Enable daily backups")}
        {field("backupRetentionDays","Backup Retention Days","number")}
      </div>}

      {tab === "Templates" && <table><thead><tr><th>Name</th><th>Code</th><th>Channel</th><th>Status</th></tr></thead>
        <tbody>{templates.map((x) => <tr key={x.id}><td>{x.name}<small>{x.subject}</small></td><td>{x.code}</td><td>{x.channel}</td><td>{x.isActive ? "Active" : "Inactive"}</td></tr>)}
        {!templates.length && <tr><td colSpan="4">No notification templates configured.</td></tr>}</tbody></table>}

      {tab === "Audit" && <table><thead><tr><th>Date</th><th>Action</th><th>Module</th><th>Description</th></tr></thead>
        <tbody>{audit.map((x) => <tr key={x.id}><td>{new Date(x.createdAt).toLocaleString()}</td><td>{x.action}</td><td>{x.module}</td><td>{x.description || "—"}</td></tr>)}
        {!audit.length && <tr><td colSpan="4">No audit records yet.</td></tr>}</tbody></table>}
    </form>
  </div>;
}
