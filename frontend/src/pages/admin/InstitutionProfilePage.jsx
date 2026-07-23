import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams
} from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe2,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRoundCog,
  X
} from "lucide-react";
import { api } from "../../services/api";

const editableFields = [
  "name",
  "code",
  "tenantKey",
  "subdomain",
  "customDomain",
  "officialEmail",
  "billingEmail",
  "primaryPhone",
  "secondaryPhone",
  "contactPersonName",
  "contactPersonTitle",
  "city",
  "country",
  "address"
];

const requiredFields = new Set([
  "name",
  "code",
  "tenantKey",
  "subdomain"
]);

const fieldDefinitions = [
  ["name", "Institution Name", "text"],
  ["code", "Institution Code", "text"],
  ["tenantKey", "Tenant Key", "text"],
  ["subdomain", "Subdomain", "text"],
  ["customDomain", "Custom Domain", "text"],
  ["officialEmail", "Official Email", "email"],
  ["billingEmail", "Billing Email", "email"],
  ["primaryPhone", "Primary Phone", "text"],
  ["secondaryPhone", "Secondary Phone", "text"],
  ["contactPersonName", "Primary Contact", "text"],
  [
    "contactPersonTitle",
    "Contact Designation",
    "text"
  ],
  ["city", "City", "text"],
  ["country", "Country", "text"],
  ["address", "Full Address", "textarea"]
];

function stringValue(value) {
  return value === null || value === undefined
    ? ""
    : String(value);
}

function editableForm(institution) {
  return Object.fromEntries(
    editableFields.map((field) => [
      field,
      stringValue(institution?.[field])
    ])
  );
}

function cleanOptionalDomain(value) {
  const trimmed = stringValue(value).trim();

  // Treat placeholder dots as an empty optional domain.
  if (!trimmed || /^\.+$/.test(trimmed)) {
    return "";
  }

  return trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

function validHostname(value) {
  if (!value) return true;

  return (
    value.length <= 253 &&
    value.includes(".") &&
    !value.includes("..") &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
      value
    )
  );
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    code: form.code
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-"),
    tenantKey: form.tenantKey
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-"),
    subdomain: cleanOptionalDomain(form.subdomain),
    customDomain: cleanOptionalDomain(
      form.customDomain
    ),
    officialEmail: form.officialEmail
      .trim()
      .toLowerCase(),
    billingEmail: form.billingEmail
      .trim()
      .toLowerCase(),
    primaryPhone: form.primaryPhone.trim(),
    secondaryPhone: form.secondaryPhone.trim(),
    contactPersonName:
      form.contactPersonName.trim(),
    contactPersonTitle:
      form.contactPersonTitle.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    country: form.country.trim() || "Pakistan"
  };
}

function validatePayload(payload) {
  const errors = {};

  if (payload.name.length < 2) {
    errors.name =
      "Institution name must contain at least 2 characters.";
  }

  if (
    !/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(
      payload.code
    )
  ) {
    errors.code =
      "Use 2–30 uppercase letters, numbers or hyphens.";
  }

  if (
    !/^[a-z0-9][a-z0-9-]{1,79}$/.test(
      payload.tenantKey
    )
  ) {
    errors.tenantKey =
      "Use at least 2 lowercase letters, numbers or hyphens.";
  }

  if (!validHostname(payload.subdomain)) {
    errors.subdomain =
      "Enter a valid hostname, for example city-erp.com.";
  }

  if (
    payload.customDomain &&
    !validHostname(payload.customDomain)
  ) {
    errors.customDomain =
      "Enter a valid custom domain or leave this field empty.";
  }

  for (const field of [
    "officialEmail",
    "billingEmail"
  ]) {
    if (
      payload[field] &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        payload[field]
      )
    ) {
      errors[field] = "Enter a valid email address.";
    }
  }

  return errors;
}

function backendFieldErrors(payload) {
  const source =
    payload?.errors ||
    payload?.details ||
    {};

  if (Array.isArray(source)) {
    return Object.fromEntries(
      source.map((issue) => {
        const path = Array.isArray(issue.path)
          ? issue.path.at(-1)
          : stringValue(issue.field)
              .split(".")
              .at(-1);

        return [
          path || "form",
          issue.message || "Invalid value."
        ];
      })
    );
  }

  if (source && typeof source === "object") {
    return Object.fromEntries(
      Object.entries(source).map(
        ([field, message]) => [
          field.split(".").at(-1),
          Array.isArray(message)
            ? message[0]
            : stringValue(message)
        ]
      )
    );
  }

  return {};
}

export function InstitutionProfilePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [institution, setInstitution] =
    useState(null);
  const [form, setForm] = useState(
    editableForm(null)
  );
  const [editing, setEditing] = useState(
    searchParams.get("edit") === "1"
  );
  const [fieldErrors, setFieldErrors] =
    useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const response = await api.get(
        `/platform/institutions/${id}`
      );

      const item = response.data.data;

      setInstitution(item);
      setForm(editableForm(item));
      setFieldErrors({});
      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load institution profile."
      );
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const hasChanges = useMemo(() => {
    if (!institution) return false;

    const original = buildPayload(
      editableForm(institution)
    );
    const current = buildPayload(form);

    return JSON.stringify(original) !==
      JSON.stringify(current);
  }, [form, institution]);

  function change(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));

    setFieldErrors((current) => {
      if (!current[field]) return current;

      const next = { ...current };
      delete next[field];
      return next;
    });

    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setForm(editableForm(institution));
    setFieldErrors({});
    setError("");
    setMessage("");
    setEditing(false);
  }

  async function save(event) {
    event.preventDefault();

    const payload = buildPayload(form);
    const validationErrors =
      validatePayload(payload);

    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setError(
        "Please correct the highlighted fields."
      );

      const firstField =
        Object.keys(validationErrors)[0];

      document
        .querySelector(
          `[name="${firstField}"]`
        )
        ?.focus();

      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    setFieldErrors({});

    try {
      const response = await api.put(
        `/platform/institutions/${id}`,
        payload
      );

      setMessage(
        response.data?.message ||
          "Institution profile updated successfully."
      );
      setEditing(false);
      await load();
    } catch (requestError) {
      const responsePayload =
        requestError.response?.data || {};

      const errors =
        backendFieldErrors(responsePayload);

      setFieldErrors(errors);

      if (Object.keys(errors).length) {
        setError(
          "Please correct the highlighted fields."
        );
      } else {
        setError(
          responsePayload.message ||
            "Unable to update institution."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeInstitution() {
    if (institution.status !== "SUSPENDED") {
      setError(
        "Suspend the institution before removing it."
      );
      return;
    }

    if (
      !window.confirm(
        `Permanently remove ${institution.name}? This also removes tenant users and billing records.`
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/platform/institutions/${id}`
      );

      navigate(
        "/super-admin/institutions",
        { replace: true }
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to remove institution."
      );
    }
  }

  if (!institution) {
    return (
      <div>
        {error ||
          "Loading institution profile..."}
      </div>
    );
  }

  const subscription =
    institution.subscriptions?.[0];

  return (
    <>
      <div className="page-head institution-profile-head">
        <div>
          <Link
            className="back-link"
            to="/super-admin/institutions"
          >
            <ArrowLeft size={16} />
            Back to Institutions
          </Link>

          <h1>{institution.name}</h1>
          <p>
            {institution.code} ·{" "}
            {institution.tenantKey}
          </p>
        </div>

        <div className="profile-head-actions">
          <span
            className={`badge ${institution.status.toLowerCase()}`}
          >
            {institution.status}
          </span>

          {editing ? (
            <>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X size={16} />
                Cancel Edit
              </button>

              <button
                type="submit"
                form="institution-edit-form"
                className="primary institution-save-button"
                disabled={saving}
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="spin"
                  />
                ) : (
                  <Save size={16} />
                )}
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setMessage("");
                setError("");
              }}
            >
              Edit Profile
            </button>
          )}

          <button
            type="button"
            className="danger-button"
            onClick={removeInstitution}
            disabled={saving}
          >
            <Trash2 size={16} />
            Remove
          </button>
        </div>
      </div>

      {message && (
        <div className="success-message">
          <CheckCircle2 size={17} />
          {message}
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {!editing ? (
        <>
          <div className="institution-profile-grid">
            <section className="panel profile-hero">
              <Building2 size={36} />
              <h2>{institution.name}</h2>
              <p>
                {institution.address ||
                  "No address"}
              </p>
              <span>
                {institution.city || "—"},{" "}
                {institution.country}
              </span>
            </section>

            <section className="panel profile-card">
              <h2>
                <Globe2 size={18} />
                Tenant & Domain
              </h2>
              <dl>
                <div>
                  <dt>Tenant Key</dt>
                  <dd>
                    {institution.tenantKey}
                  </dd>
                </div>
                <div>
                  <dt>Subdomain</dt>
                  <dd>
                    {institution.subdomain}
                  </dd>
                </div>
                <div>
                  <dt>Custom Domain</dt>
                  <dd>
                    {institution.customDomain ||
                      "Not connected"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="panel profile-card">
              <h2>
                <Phone size={18} />
                Contact Details
              </h2>
              <dl>
                <div>
                  <dt>Primary Contact</dt>
                  <dd>
                    {institution.contactPersonName ||
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt>Designation</dt>
                  <dd>
                    {institution.contactPersonTitle ||
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt>Primary Phone</dt>
                  <dd>
                    {institution.primaryPhone ||
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt>Secondary Phone</dt>
                  <dd>
                    {institution.secondaryPhone ||
                      "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="panel profile-card">
              <h2>
                <Mail size={18} />
                Official Emails
              </h2>
              <dl>
                <div>
                  <dt>Official Email</dt>
                  <dd>
                    {institution.officialEmail ||
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt>Billing Email</dt>
                  <dd>
                    {institution.billingEmail ||
                      "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="panel profile-card">
              <h2>
                <CreditCard size={18} />
                Subscription
              </h2>
              <dl>
                <div>
                  <dt>Plan</dt>
                  <dd>
                    {subscription?.plan?.name ||
                      "No plan"}
                  </dd>
                </div>
                <div>
                  <dt>Cycle</dt>
                  <dd>
                    {subscription?.plan
                      ?.billingCycle || "—"}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {subscription?.status ||
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt>Next Billing</dt>
                  <dd>
                    {subscription?.nextBillingDate
                      ? new Date(
                          subscription.nextBillingDate
                        ).toLocaleDateString()
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="panel profile-card">
              <h2>
                <ShieldCheck size={18} />
                Platform Summary
              </h2>
              <dl>
                <div>
                  <dt>Users</dt>
                  <dd>
                    {institution._count.users}
                  </dd>
                </div>
                <div>
                  <dt>Invoices</dt>
                  <dd>
                    {
                      institution._count
                        .invoices
                    }
                  </dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>
                    {new Date(
                      institution.createdAt
                    ).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="panel">
            <h2>
              <UserRoundCog size={18} />
              Institution Users
            </h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                  </tr>
                </thead>

                <tbody>
                  {institution.users.map(
                    (user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.username}</td>
                        <td>
                          {user.email || "—"}
                        </td>
                        <td>{user.role}</td>
                        <td>
                          <span
                            className={`badge ${
                              user.isActive
                                ? "active"
                                : "suspended"
                            }`}
                          >
                            {user.isActive
                              ? "ACTIVE"
                              : "DISABLED"}
                          </span>
                        </td>
                        <td>
                          {user.lastLoginAt
                            ? new Date(
                                user.lastLoginAt
                              ).toLocaleString()
                            : "Never"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="panel institution-edit-panel">
          <form
            id="institution-edit-form"
            className="form-grid institution-edit-form"
            onSubmit={save}
            noValidate
          >
            {fieldDefinitions.map(
              ([key, label, type]) => (
                <label
                  key={key}
                  className={
                    fieldErrors[key]
                      ? "has-error"
                      : ""
                  }
                >
                  <span>
                    {label}
                    {requiredFields.has(key) && (
                      <b className="required">
                        {" "}
                        *
                      </b>
                    )}
                  </span>

                  {type === "textarea" ? (
                    <textarea
                      name={key}
                      value={form[key]}
                      onChange={(event) =>
                        change(
                          key,
                          event.target.value
                        )
                      }
                      disabled={saving}
                    />
                  ) : (
                    <input
                      name={key}
                      type={type}
                      required={requiredFields.has(
                        key
                      )}
                      value={form[key]}
                      onChange={(event) =>
                        change(
                          key,
                          event.target.value
                        )
                      }
                      disabled={saving}
                    />
                  )}

                  {fieldErrors[key] && (
                    <small className="field-error">
                      {fieldErrors[key]}
                    </small>
                  )}
                </label>
              )
            )}

            <div className="institution-sticky-savebar">
              <div>
                <strong>
                  {hasChanges
                    ? "Unsaved institution changes"
                    : "No unsaved changes"}
                </strong>
                <span>
                  Required fields are marked with *.
                </span>
              </div>

              <div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary institution-save-button"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2
                      size={16}
                      className="spin"
                    />
                  ) : (
                    <Save size={16} />
                  )}
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
