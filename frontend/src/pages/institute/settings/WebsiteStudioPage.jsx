import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Home,
  Loader2,
  Plus,
  Save,
  Settings,
  Trash2,
  XCircle
} from "lucide-react";
import WebsiteRendererV3 from "../../../components/public-site/WebsiteRendererV3";
import {
  defaultWebsiteConfig,
  makeWebsiteItemId,
  normalizeWebsiteCode,
  normalizeWebsiteConfig
} from "../../../features/website-studio/websiteConfig";
import { websiteStudioV3Api } from "../../../services/websiteStudioV3";
import "../../../assets/css/website-studio-v3.css";

const tabs = [
  ["portal", "Portal Bar"],
  ["theme", "Theme & Layout"],
  ["branding", "Branding"],
  ["navigation", "Navigation Links"],
  ["headerButton", "Header Button"],
  ["hero", "Hero Section"],
  ["statistics", "Statistics"],
  ["facilities", "Facilities"],
  ["about", "About & Principal"],
  ["notices", "Notice Board"],
  ["events", "Events"],
  ["toppers", "Toppers"],
  ["admissions", "Admissions"],
  ["footer", "Contact & Footer"],
  ["order", "Section Order"],
  ["css", "Advanced CSS"]
];

const sectionLabels = {
  hero: "Hero Section",
  statistics: "Statistics",
  facilities: "Facilities",
  about: "About & Principal",
  notices: "Notice Board",
  events: "Events",
  toppers: "Toppers",
  admissions: "Admissions"
};

function Field({ label, children }) {
  return (
    <label className="ws3-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="ws3-toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function moveItem(items, index, direction) {
  const target = index + direction;

  if (target < 0 || target >= items.length) {
    return items;
  }

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function RepeatCard({
  title,
  index,
  total,
  onUp,
  onDown,
  onDelete,
  children
}) {
  return (
    <div className="ws3-repeat-card">
      <div className="ws3-repeat-head">
        <strong>{title}</strong>

        <div>
          <button
            type="button"
            disabled={index === 0}
            onClick={onUp}
            aria-label="Move up"
          >
            <ArrowUp size={14} />
          </button>

          <button
            type="button"
            disabled={index === total - 1}
            onClick={onDown}
            aria-label="Move down"
          >
            <ArrowDown size={14} />
          </button>

          <button
            type="button"
            className="danger"
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}

export default function WebsiteStudioPage() {
  const [activeTab, setActiveTab] = useState("portal");
  const [institutionCode, setInstitutionCode] = useState("EDUCARE");
  const [config, setConfig] = useState(
    normalizeWebsiteConfig(defaultWebsiteConfig)
  );
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const publicUrl = useMemo(
    () => `/site/${normalizeWebsiteCode(institutionCode)}`,
    [institutionCode]
  );

  const previewConfig = useMemo(
    () =>
      normalizeWebsiteConfig({
        ...config,
        institutionCode: normalizeWebsiteCode(institutionCode),
        publicUrl
      }),
    [config, institutionCode, publicUrl]
  );

  async function loadWebsite(code = institutionCode) {
    const normalized = normalizeWebsiteCode(code);

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await websiteStudioV3Api.getDraft(normalized);
      const next = normalizeWebsiteConfig(response.data);

      setConfig(next);
      setInstitutionCode(next.institutionCode);
      setDirty(false);
      setMessage("Website Studio loaded successfully.");
    } catch (requestError) {
      const local = localStorage.getItem(`website-studio-v3-${normalized}`);

      if (local) {
        try {
          setConfig(normalizeWebsiteConfig(JSON.parse(local)));
          setMessage("Browser recovery draft loaded.");
        } catch {
          setConfig(
            normalizeWebsiteConfig({
              ...defaultWebsiteConfig,
              institutionCode: normalized
            })
          );
        }
      }

      setInstitutionCode(normalized);
      setError(
        requestError?.response?.data?.message ||
          requestError.message ||
          "Website Studio could not load from the server."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWebsite("EDUCARE");
  }, []);

  function mutate(mutator) {
    setConfig((current) => {
      const next = JSON.parse(JSON.stringify(current));
      mutator(next);
      next.status = "DRAFT";
      return next;
    });

    setDirty(true);
    setMessage("");
    setError("");
  }

  function setPath(path, value) {
    mutate((next) => {
      const parts = path.split(".");
      let target = next;

      for (let index = 0; index < parts.length - 1; index += 1) {
        target = target[parts[index]];
      }

      target[parts.at(-1)] = value;

      if (path === "branding.instituteName") {
        next.branding.name = value;
      }
    });
  }

  function updateList(section, itemId, field, value) {
    mutate((next) => {
      const item = next[section].items.find(
        (record) => record.id === itemId
      );

      if (item) {
        item[field] = value;
      }
    });
  }

  function addListItem(section, item) {
    mutate((next) => {
      next[section].items.push(item);
    });
  }

  function removeListItem(section, itemId) {
    mutate((next) => {
      next[section].items = next[section].items.filter(
        (item) => item.id !== itemId
      );
    });
  }

  function moveListItem(section, index, direction) {
    mutate((next) => {
      next[section].items = moveItem(
        next[section].items,
        index,
        direction
      );
    });
  }

  async function saveDraft() {
    const payload = normalizeWebsiteConfig({
      ...config,
      institutionCode: normalizeWebsiteCode(institutionCode),
      status: "DRAFT",
      updatedAt: new Date().toISOString()
    });

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const response = await websiteStudioV3Api.saveDraft(payload);
      const saved = normalizeWebsiteConfig(response.data);

      setConfig(saved);
      setInstitutionCode(saved.institutionCode);
      setDirty(false);
      localStorage.setItem(
        `website-studio-v3-${saved.institutionCode}`,
        JSON.stringify(saved)
      );
      setMessage(response.message || "All Website Studio changes were saved.");
    } catch (requestError) {
      localStorage.setItem(
        `website-studio-v3-${payload.institutionCode}`,
        JSON.stringify(payload)
      );
      setError(
        requestError?.response?.data?.message ||
          "Server save failed. A browser recovery copy was saved."
      );
    } finally {
      setWorking(false);
    }
  }

  async function publish() {
    const payload = normalizeWebsiteConfig({
      ...config,
      institutionCode: normalizeWebsiteCode(institutionCode),
      status: "PUBLISHED"
    });

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const response = await websiteStudioV3Api.publish(payload);
      const published = normalizeWebsiteConfig(response.data);

      setConfig(published);
      setInstitutionCode(published.institutionCode);
      setDirty(false);
      localStorage.setItem(
        `website-studio-v3-${published.institutionCode}`,
        JSON.stringify(published)
      );
      setMessage(response.message || "Website was saved and published.");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "The server publish request failed."
      );
    } finally {
      setWorking(false);
    }
  }

  async function unpublish() {
    setWorking(true);
    setError("");
    setMessage("");

    try {
      const response = await websiteStudioV3Api.unpublish();
      const draft = normalizeWebsiteConfig(response.data);

      setConfig(draft);
      setDirty(false);
      setMessage(response.message || "Website was unpublished.");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "The website could not be unpublished."
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <div className="ws3-state">
        <Loader2 className="spin" />
        Loading full Website Studio...
      </div>
    );
  }

  return (
    <div className="ws3-studio-page">
      <nav className="ws3-breadcrumb">
        <div>
          <Link to="/dashboard">
            <Home size={14} />
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/settings">Settings</Link>
          <span>/</span>
          <strong>Website Studio</strong>
        </div>

        <div>
          <Link to="/dashboard">
            <ArrowLeft size={15} />
            Back to Dashboard
          </Link>
          <Link to="/settings">
            <Settings size={15} />
            ERP Settings
          </Link>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="primary">
            <ExternalLink size={15} />
            Open Public Website
          </a>
        </div>
      </nav>

      <header className="ws3-studio-header">
        <div>
          <span>FULL LANDING-PAGE BUILDER</span>
          <h1>Website Studio</h1>
          <p>
            Edit every landing-page section, preview the exact result, save a
            draft, and publish the same design.
          </p>
        </div>

        <div className="ws3-global-actions">
          <span className="save-state">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>

          <span className={`status ${config.status.toLowerCase()}`}>
            {config.status}
          </span>

          <button type="button" onClick={saveDraft} disabled={working}>
            <Save size={15} />
            Save Draft
          </button>

          {config.status === "PUBLISHED" && (
            <button
              type="button"
              className="danger-soft"
              onClick={unpublish}
              disabled={working}
            >
              <XCircle size={15} />
              Unpublish
            </button>
          )}

          <button
            type="button"
            className="primary"
            onClick={publish}
            disabled={working}
          >
            <CheckCircle2 size={15} />
            Save & Publish
          </button>
        </div>
      </header>

      <section className="ws3-code-row">
        <Field label="Institution Website Code">
          <input
            value={institutionCode}
            onChange={(event) => {
              setInstitutionCode(event.target.value);
              setDirty(true);
            }}
          />
        </Field>

        <button
          type="button"
          onClick={() => loadWebsite(institutionCode)}
          disabled={working}
        >
          Load Institute Website
        </button>

        <a href={publicUrl} target="_blank" rel="noreferrer">
          {publicUrl}
        </a>
      </section>

      {message && <div className="ws3-message success">{message}</div>}
      {error && <div className="ws3-message error">{error}</div>}

      <div className="ws3-workspace">
        <aside className="ws3-controls">
          <strong>Whole Page Controls</strong>

          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={activeTab === id ? "active" : ""}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </aside>

        <section className="ws3-editor">
          <div className="ws3-editor-title">
            <span>EDITING</span>
            <h2>{tabs.find(([id]) => id === activeTab)?.[1]}</h2>
          </div>

          {activeTab === "portal" && (
            <>
              <Toggle
                label="Show Public Portal Bar"
                checked={config.portalBar.visible}
                onChange={(value) => setPath("portalBar.visible", value)}
              />

              {[
                ["modeText", "Mode Text"],
                ["description", "Description"],
                ["backLabel", "Back Button Label"],
                ["backUrl", "Back Button URL"],
                ["verifiedText", "Verified Text"]
              ].map(([field, label]) => (
                <Field key={field} label={label}>
                  <input
                    value={config.portalBar[field]}
                    onChange={(event) =>
                      setPath(`portalBar.${field}`, event.target.value)
                    }
                  />
                </Field>
              ))}
            </>
          )}

          {activeTab === "theme" && (
            <>
              {[
                ["primaryColor", "Primary Color"],
                ["accentColor", "Accent Color"],
                ["backgroundColor", "Page Background"],
                ["surfaceColor", "Surface Color"],
                ["textColor", "Text Color"],
                ["mutedColor", "Muted Text Color"],
                ["headerBackground", "Header Background"],
                ["footerBackground", "Footer Background"]
              ].map(([field, label]) => (
                <Field key={field} label={label}>
                  <input
                    type="color"
                    value={config.theme[field]}
                    onChange={(event) =>
                      setPath(`theme.${field}`, event.target.value)
                    }
                  />
                </Field>
              ))}

              <Field label="Font Family">
                <select
                  value={config.theme.fontFamily}
                  onChange={(event) =>
                    setPath("theme.fontFamily", event.target.value)
                  }
                >
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="system-ui">System UI</option>
                </select>
              </Field>

              {[
                ["maxWidth", "Maximum Width"],
                ["sectionPadding", "Section Padding"],
                ["cardRadius", "Card Radius"],
                ["buttonRadius", "Button Radius"]
              ].map(([field, label]) => (
                <Field key={field} label={label}>
                  <input
                    value={config.theme[field]}
                    onChange={(event) =>
                      setPath(`theme.${field}`, event.target.value)
                    }
                  />
                </Field>
              ))}
            </>
          )}

          {activeTab === "branding" && (
            <>
              <Field label="Logo Type">
                <select
                  value={config.branding.logoType}
                  onChange={(event) =>
                    setPath("branding.logoType", event.target.value)
                  }
                >
                  <option value="text">Text Logo</option>
                  <option value="image">Image Logo</option>
                </select>
              </Field>

              <Field label="Logo Text">
                <input
                  value={config.branding.logoText}
                  onChange={(event) =>
                    setPath("branding.logoText", event.target.value)
                  }
                />
              </Field>

              <Field label="Logo Image URL">
                <input
                  value={config.branding.logoUrl}
                  onChange={(event) =>
                    setPath("branding.logoUrl", event.target.value)
                  }
                />
              </Field>

              <Field label="Institute Name">
                <input
                  value={config.branding.instituteName}
                  onChange={(event) =>
                    setPath("branding.instituteName", event.target.value)
                  }
                />
              </Field>

              <Field label="Tagline">
                <textarea
                  value={config.branding.tagline}
                  onChange={(event) =>
                    setPath("branding.tagline", event.target.value)
                  }
                />
              </Field>
            </>
          )}

          {activeTab === "navigation" && (
            <>
              <button
                type="button"
                className="ws3-add-button"
                onClick={() =>
                  mutate((next) => {
                    next.navigation.push({
                      id: makeWebsiteItemId("nav"),
                      label: "New Link",
                      target: "#home",
                      visible: true
                    });
                  })
                }
              >
                <Plus size={15} />
                Add Navigation Link
              </button>

              {config.navigation.map((item, index) => (
                <RepeatCard
                  key={item.id}
                  title={`Link ${index + 1}`}
                  index={index}
                  total={config.navigation.length}
                  onUp={() =>
                    mutate((next) => {
                      next.navigation = moveItem(next.navigation, index, -1);
                    })
                  }
                  onDown={() =>
                    mutate((next) => {
                      next.navigation = moveItem(next.navigation, index, 1);
                    })
                  }
                  onDelete={() =>
                    mutate((next) => {
                      next.navigation = next.navigation.filter(
                        (record) => record.id !== item.id
                      );
                    })
                  }
                >
                  <Toggle
                    label="Visible"
                    checked={item.visible}
                    onChange={(value) =>
                      mutate((next) => {
                        next.navigation.find(
                          (record) => record.id === item.id
                        ).visible = value;
                      })
                    }
                  />

                  <Field label="Label">
                    <input
                      value={item.label}
                      onChange={(event) =>
                        mutate((next) => {
                          next.navigation.find(
                            (record) => record.id === item.id
                          ).label = event.target.value;
                        })
                      }
                    />
                  </Field>

                  <Field label="Target">
                    <input
                      value={item.target}
                      onChange={(event) =>
                        mutate((next) => {
                          next.navigation.find(
                            (record) => record.id === item.id
                          ).target = event.target.value;
                        })
                      }
                    />
                  </Field>
                </RepeatCard>
              ))}
            </>
          )}

          {activeTab === "headerButton" && (
            <>
              <Toggle
                label="Show Header Button"
                checked={config.headerButton.visible}
                onChange={(value) => setPath("headerButton.visible", value)}
              />

              <Field label="Button Text">
                <input
                  value={config.headerButton.text}
                  onChange={(event) =>
                    setPath("headerButton.text", event.target.value)
                  }
                />
              </Field>

              <Field label="Button Target">
                <input
                  value={config.headerButton.target}
                  onChange={(event) =>
                    setPath("headerButton.target", event.target.value)
                  }
                />
              </Field>
            </>
          )}

          {activeTab === "hero" && (
            <>
              <Toggle
                label="Show Hero Section"
                checked={config.hero.visible}
                onChange={(value) => setPath("hero.visible", value)}
              />

              {[
                ["eyebrow", "Eyebrow"],
                ["title", "Main Heading"],
                ["description", "Description"],
                ["primaryButtonText", "Primary Button Text"],
                ["primaryButtonUrl", "Primary Button URL"],
                ["secondaryButtonText", "Secondary Button Text"],
                ["secondaryButtonUrl", "Secondary Button URL"],
                ["imageUrl", "Hero Image URL"],
                ["imageAlt", "Image Alt Text"],
                ["bannerLabel", "Fallback Banner Label"]
              ].map(([field, label]) => (
                <Field key={field} label={label}>
                  {["title", "description"].includes(field) ? (
                    <textarea
                      value={config.hero[field]}
                      onChange={(event) =>
                        setPath(`hero.${field}`, event.target.value)
                      }
                    />
                  ) : (
                    <input
                      value={config.hero[field]}
                      onChange={(event) =>
                        setPath(`hero.${field}`, event.target.value)
                      }
                    />
                  )}
                </Field>
              ))}
            </>
          )}

          {activeTab === "statistics" && (
            <>
              <Toggle
                label="Show Statistics"
                checked={config.statistics.visible}
                onChange={(value) => setPath("statistics.visible", value)}
              />

              <button
                type="button"
                className="ws3-add-button"
                onClick={() =>
                  addListItem("statistics", {
                    id: makeWebsiteItemId("stat"),
                    value: "0",
                    label: "New Statistic"
                  })
                }
              >
                <Plus size={15} />
                Add Statistic
              </button>

              {config.statistics.items.map((item, index) => (
                <RepeatCard
                  key={item.id}
                  title={`Statistic ${index + 1}`}
                  index={index}
                  total={config.statistics.items.length}
                  onUp={() => moveListItem("statistics", index, -1)}
                  onDown={() => moveListItem("statistics", index, 1)}
                  onDelete={() => removeListItem("statistics", item.id)}
                >
                  <Field label="Value">
                    <input
                      value={item.value}
                      onChange={(event) =>
                        updateList(
                          "statistics",
                          item.id,
                          "value",
                          event.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Label">
                    <input
                      value={item.label}
                      onChange={(event) =>
                        updateList(
                          "statistics",
                          item.id,
                          "label",
                          event.target.value
                        )
                      }
                    />
                  </Field>
                </RepeatCard>
              ))}
            </>
          )}

          {activeTab === "facilities" && (
            <>
              <Toggle
                label="Show Facilities"
                checked={config.facilities.visible}
                onChange={(value) => setPath("facilities.visible", value)}
              />

              <Field label="Eyebrow">
                <input
                  value={config.facilities.eyebrow}
                  onChange={(event) =>
                    setPath("facilities.eyebrow", event.target.value)
                  }
                />
              </Field>

              <Field label="Heading">
                <textarea
                  value={config.facilities.title}
                  onChange={(event) =>
                    setPath("facilities.title", event.target.value)
                  }
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={config.facilities.description}
                  onChange={(event) =>
                    setPath("facilities.description", event.target.value)
                  }
                />
              </Field>

              <button
                type="button"
                className="ws3-add-button"
                onClick={() =>
                  addListItem("facilities", {
                    id: makeWebsiteItemId("facility"),
                    title: "New Facility",
                    description: "Describe the facility.",
                    imageUrl: ""
                  })
                }
              >
                <Plus size={15} />
                Add Facility
              </button>

              {config.facilities.items.map((item, index) => (
                <RepeatCard
                  key={item.id}
                  title={`Facility ${index + 1}`}
                  index={index}
                  total={config.facilities.items.length}
                  onUp={() => moveListItem("facilities", index, -1)}
                  onDown={() => moveListItem("facilities", index, 1)}
                  onDelete={() => removeListItem("facilities", item.id)}
                >
                  {[
                    ["title", "Title"],
                    ["description", "Description"],
                    ["imageUrl", "Image URL"]
                  ].map(([field, label]) => (
                    <Field key={field} label={label}>
                      {field === "description" ? (
                        <textarea
                          value={item[field]}
                          onChange={(event) =>
                            updateList(
                              "facilities",
                              item.id,
                              field,
                              event.target.value
                            )
                          }
                        />
                      ) : (
                        <input
                          value={item[field]}
                          onChange={(event) =>
                            updateList(
                              "facilities",
                              item.id,
                              field,
                              event.target.value
                            )
                          }
                        />
                      )}
                    </Field>
                  ))}
                </RepeatCard>
              ))}
            </>
          )}

          {activeTab === "about" && (
            <>
              <Toggle
                label="Show About Section"
                checked={config.about.visible}
                onChange={(value) => setPath("about.visible", value)}
              />

              {[
                ["eyebrow", "About Eyebrow"],
                ["title", "About Heading"],
                ["description", "About Description"],
                ["principalEyebrow", "Principal Eyebrow"],
                ["principalTitle", "Principal Heading"],
                ["principalMessage", "Principal Message"],
                ["principalName", "Principal Name"],
                ["principalRole", "Principal Role"],
                ["principalPhotoUrl", "Principal Photo URL"]
              ].map(([field, label]) => (
                <Field key={field} label={label}>
                  {["title", "description", "principalMessage"].includes(
                    field
                  ) ? (
                    <textarea
                      value={config.about[field]}
                      onChange={(event) =>
                        setPath(`about.${field}`, event.target.value)
                      }
                    />
                  ) : (
                    <input
                      value={config.about[field]}
                      onChange={(event) =>
                        setPath(`about.${field}`, event.target.value)
                      }
                    />
                  )}
                </Field>
              ))}
            </>
          )}

          {activeTab === "notices" && (
            <>
              <Toggle
                label="Show Notice Board"
                checked={config.notices.visible}
                onChange={(value) => setPath("notices.visible", value)}
              />

              <Field label="Eyebrow">
                <input
                  value={config.notices.eyebrow}
                  onChange={(event) =>
                    setPath("notices.eyebrow", event.target.value)
                  }
                />
              </Field>

              <Field label="Heading">
                <input
                  value={config.notices.title}
                  onChange={(event) =>
                    setPath("notices.title", event.target.value)
                  }
                />
              </Field>

              <button
                type="button"
                className="ws3-add-button"
                onClick={() =>
                  addListItem("notices", {
                    id: makeWebsiteItemId("notice"),
                    date: "",
                    title: "New Notice",
                    description: "Notice details."
                  })
                }
              >
                <Plus size={15} />
                Add Notice
              </button>

              {config.notices.items.map((item, index) => (
                <RepeatCard
                  key={item.id}
                  title={`Notice ${index + 1}`}
                  index={index}
                  total={config.notices.items.length}
                  onUp={() => moveListItem("notices", index, -1)}
                  onDown={() => moveListItem("notices", index, 1)}
                  onDelete={() => removeListItem("notices", item.id)}
                >
                  <Field label="Date">
                    <input
                      type="date"
                      value={item.date}
                      onChange={(event) =>
                        updateList(
                          "notices",
                          item.id,
                          "date",
                          event.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Title">
                    <input
                      value={item.title}
                      onChange={(event) =>
                        updateList(
                          "notices",
                          item.id,
                          "title",
                          event.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="Description">
                    <textarea
                      value={item.description}
                      onChange={(event) =>
                        updateList(
                          "notices",
                          item.id,
                          "description",
                          event.target.value
                        )
                      }
                    />
                  </Field>
                </RepeatCard>
              ))}
            </>
          )}

          {activeTab === "events" && (
            <>
              <Toggle
                label="Show Events"
                checked={config.events.visible}
                onChange={(value) => setPath("events.visible", value)}
              />

              <Field label="Eyebrow">
                <input
                  value={config.events.eyebrow}
                  onChange={(event) =>
                    setPath("events.eyebrow", event.target.value)
                  }
                />
              </Field>

              <Field label="Heading">
                <input
                  value={config.events.title}
                  onChange={(event) =>
                    setPath("events.title", event.target.value)
                  }
                />
              </Field>

              <button
                type="button"
                className="ws3-add-button"
                onClick={() =>
                  addListItem("events", {
                    id: makeWebsiteItemId("event"),
                    type: "Event",
                    date: "",
                    title: "New Event",
                    description: "Event description.",
                    venue: "Campus",
                    imageUrl: ""
                  })
                }
              >
                <Plus size={15} />
                Add Event
              </button>

              {config.events.items.map((item, index) => (
                <RepeatCard
                  key={item.id}
                  title={`Event ${index + 1}`}
                  index={index}
                  total={config.events.items.length}
                  onUp={() => moveListItem("events", index, -1)}
                  onDown={() => moveListItem("events", index, 1)}
                  onDelete={() => removeListItem("events", item.id)}
                >
                  {[
                    ["type", "Type"],
                    ["date", "Date"],
                    ["title", "Title"],
                    ["description", "Description"],
                    ["venue", "Venue"],
                    ["imageUrl", "Image URL"]
                  ].map(([field, label]) => (
                    <Field key={field} label={label}>
                      {field === "description" ? (
                        <textarea
                          value={item[field]}
                          onChange={(event) =>
                            updateList(
                              "events",
                              item.id,
                              field,
                              event.target.value
                            )
                          }
                        />
                      ) : (
                        <input
                          type={field === "date" ? "date" : "text"}
                          value={item[field]}
                          onChange={(event) =>
                            updateList(
                              "events",
                              item.id,
                              field,
                              event.target.value
                            )
                          }
                        />
                      )}
                    </Field>
                  ))}
                </RepeatCard>
              ))}
            </>
          )}

          {activeTab === "toppers" && (
            <>
              <Toggle
                label="Show Toppers"
                checked={config.toppers.visible}
                onChange={(value) => setPath("toppers.visible", value)}
              />

              <Field label="Eyebrow">
                <input
                  value={config.toppers.eyebrow}
                  onChange={(event) =>
                    setPath("toppers.eyebrow", event.target.value)
                  }
                />
              </Field>

              <Field label="Heading">
                <input
                  value={config.toppers.title}
                  onChange={(event) =>
                    setPath("toppers.title", event.target.value)
                  }
                />
              </Field>

              <button
                type="button"
                className="ws3-add-button"
                onClick={() =>
                  addListItem("toppers", {
                    id: makeWebsiteItemId("topper"),
                    position: `Position ${config.toppers.items.length + 1}`,
                    name: "Student Name",
                    className: "Class / Stream",
                    score: "0%",
                    scoreLabel: "Score",
                    photoUrl: ""
                  })
                }
              >
                <Plus size={15} />
                Add Topper
              </button>

              {config.toppers.items.map((item, index) => (
                <RepeatCard
                  key={item.id}
                  title={`Topper ${index + 1}`}
                  index={index}
                  total={config.toppers.items.length}
                  onUp={() => moveListItem("toppers", index, -1)}
                  onDown={() => moveListItem("toppers", index, 1)}
                  onDelete={() => removeListItem("toppers", item.id)}
                >
                  {[
                    ["position", "Position"],
                    ["name", "Student Name"],
                    ["className", "Class / Stream"],
                    ["score", "Score"],
                    ["scoreLabel", "Score Label"],
                    ["photoUrl", "Photo URL"]
                  ].map(([field, label]) => (
                    <Field key={field} label={label}>
                      <input
                        value={item[field]}
                        onChange={(event) =>
                          updateList(
                            "toppers",
                            item.id,
                            field,
                            event.target.value
                          )
                        }
                      />
                    </Field>
                  ))}
                </RepeatCard>
              ))}
            </>
          )}

          {activeTab === "admissions" && (
            <>
              <Toggle
                label="Show Admissions Section"
                checked={config.admissions.visible}
                onChange={(value) => setPath("admissions.visible", value)}
              />

              <Field label="Heading">
                <textarea
                  value={config.admissions.title}
                  onChange={(event) =>
                    setPath("admissions.title", event.target.value)
                  }
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={config.admissions.description}
                  onChange={(event) =>
                    setPath("admissions.description", event.target.value)
                  }
                />
              </Field>

              <Field label="Button Text">
                <input
                  value={config.admissions.buttonText}
                  onChange={(event) =>
                    setPath("admissions.buttonText", event.target.value)
                  }
                />
              </Field>

              <Field label="Button URL">
                <input
                  value={config.admissions.buttonUrl}
                  onChange={(event) =>
                    setPath("admissions.buttonUrl", event.target.value)
                  }
                />
              </Field>
            </>
          )}

          {activeTab === "footer" && (
            <>
              <Toggle
                label="Show Footer"
                checked={config.footer.visible}
                onChange={(value) => setPath("footer.visible", value)}
              />

              {[
                ["instituteName", "Institute Name"],
                ["tagline", "Tagline"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["address", "Address"],
                ["copyright", "Copyright"],
                ["verifiedText", "Verified Text"]
              ].map(([field, label]) => (
                <Field key={field} label={label}>
                  {["tagline", "address", "copyright"].includes(field) ? (
                    <textarea
                      value={config.footer[field]}
                      onChange={(event) =>
                        setPath(`footer.${field}`, event.target.value)
                      }
                    />
                  ) : (
                    <input
                      value={config.footer[field]}
                      onChange={(event) =>
                        setPath(`footer.${field}`, event.target.value)
                      }
                    />
                  )}
                </Field>
              ))}
            </>
          )}

          {activeTab === "order" &&
            config.sectionOrder.map((section, index) => (
              <div className="ws3-order-row" key={section}>
                <span>{sectionLabels[section]}</span>

                <div>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() =>
                      mutate((next) => {
                        next.sectionOrder = moveItem(
                          next.sectionOrder,
                          index,
                          -1
                        );
                      })
                    }
                  >
                    <ArrowUp size={14} />
                  </button>

                  <button
                    type="button"
                    disabled={index === config.sectionOrder.length - 1}
                    onClick={() =>
                      mutate((next) => {
                        next.sectionOrder = moveItem(
                          next.sectionOrder,
                          index,
                          1
                        );
                      })
                    }
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            ))}

          {activeTab === "css" && (
            <Field label="Advanced Custom CSS">
              <textarea
                className="ws3-code"
                value={config.customCss}
                onChange={(event) =>
                  setPath("customCss", event.target.value)
                }
                placeholder=".ws3-public-site { ... }"
              />
            </Field>
          )}

          <div className="ws3-editor-savebar">
            <div>
              <strong>
                {tabs.find(([id]) => id === activeTab)?.[1]} Controls
              </strong>
              <span>
                {dirty
                  ? "This section has unsaved changes."
                  : "This section is saved."}
              </span>
            </div>

            <div>
              <button type="button" onClick={saveDraft} disabled={working}>
                <Save size={15} />
                Update Section
              </button>

              <button
                type="button"
                className="primary"
                onClick={publish}
                disabled={working}
              >
                <CheckCircle2 size={15} />
                Save & Publish
              </button>
            </div>
          </div>
        </section>

        <section className="ws3-preview">
          <div className="ws3-preview-head">
            <div>
              <strong>Exact Live Draft Preview</strong>
              <span>The public page uses this same renderer.</span>
            </div>

            <a href={publicUrl} target="_blank" rel="noreferrer">
              {publicUrl}
              <ExternalLink size={14} />
            </a>
          </div>

          <div className="ws3-preview-canvas">
            <WebsiteRendererV3
              config={previewConfig}
              compact
              showAdminBackLink={false}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
