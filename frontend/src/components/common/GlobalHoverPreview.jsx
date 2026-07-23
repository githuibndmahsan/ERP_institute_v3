import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TARGETS = "tbody tr,.metric,.stat-card,.kpi-card,.summary-card,.dashboard-card,.student-stats > div,[data-hover-preview]";
const BLOCKED = ".modal-backdrop,.modal-card,form,button,a,input,select,textarea,[data-no-hover-preview]";

const tidy = (value = "") => String(value).replace(/\s+/g, " ").trim();

function fieldsFromRow(row) {
  const table = row.closest("table");
  const heads = table ? [...table.querySelectorAll("thead th")].map((x) => tidy(x.textContent)) : [];
  return [...row.children]
    .map((cell, i) => ({ label: heads[i] || `Field ${i + 1}`, value: tidy(cell.textContent) }))
    .filter((x) => x.value && !/^actions?$/i.test(x.label))
    .slice(0, 10);
}

function fieldsFromCard(el) {
  const explicit = tidy(el.dataset.previewBody);
  if (explicit) return [{ label: "Information", value: explicit }];
  const label = tidy(el.querySelector(".stat-card-label,.metric-label,.kpi-label,.summary-label,small,span")?.textContent);
  const value = tidy(el.querySelector(".stat-card-value,.metric-value,.kpi-value,.summary-value,strong,h2,h3")?.textContent);
  if (label && value && label !== value) return [{ label, value }];
  const text = tidy(el.textContent);
  return text ? [{ label: "Information", value: text }] : [];
}

function titleFrom(el) {
  if (tidy(el.dataset.previewTitle)) return tidy(el.dataset.previewTitle);
  if (el.matches("tbody tr")) return tidy(el.querySelector("strong,a,td")?.textContent || "Record Preview");
  return tidy(el.querySelector("h1,h2,h3,h4,strong")?.textContent || el.getAttribute("aria-label") || "Quick Preview");
}

function position(rect) {
  const width = 360, height = 300, gap = 14;
  let left = rect.right + gap;
  let top = rect.top;
  if (left + width > window.innerWidth - gap) left = rect.left - width - gap;
  if (left < gap) left = Math.max(gap, Math.min(window.innerWidth - width - gap, rect.left + rect.width / 2 - width / 2));
  if (top + height > window.innerHeight - gap) top = Math.max(gap, window.innerHeight - height - gap);
  return { left, top };
}

export default function GlobalHoverPreview() {
  const [preview, setPreview] = useState(null);
  const timer = useRef(null);
  const active = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const clear = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; };
    const close = () => { clear(); active.current = null; setPreview(null); };
    const resolve = (target) => {
      if (!(target instanceof Element) || target.closest(BLOCKED)) return null;
      const el = target.closest(TARGETS);
      if (!el || el.dataset.hoverPreview === "off" || el.closest(".erp-hover-preview")) return null;
      return el;
    };
    const show = (el) => {
      const fields = el.matches("tbody tr") ? fieldsFromRow(el) : fieldsFromCard(el);
      if (!fields.length) return;
      active.current = el;
      setPreview({ title: titleFrom(el), fields, ...position(el.getBoundingClientRect()) });
    };
    const over = (e) => {
      const el = resolve(e.target);
      if (!el || el === active.current) return;
      clear(); timer.current = window.setTimeout(() => show(el), 320);
    };
    const out = (e) => {
      const related = e.relatedTarget;
      if (active.current && related instanceof Node && (active.current.contains(related) || document.querySelector(".erp-hover-preview")?.contains(related))) return;
      close();
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      clear();
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  if (!preview) return null;

  return createPortal(
    <aside className="erp-hover-preview" role="tooltip" style={{ left: preview.left, top: preview.top }} onPointerLeave={() => { active.current = null; setPreview(null); }}>
      <div className="erp-hover-preview__header"><span>QUICK PREVIEW</span><h3>{preview.title}</h3></div>
      <dl className="erp-hover-preview__list">
        {preview.fields.map((item, index) => <div className="erp-hover-preview__item" key={`${item.label}-${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
      </dl>
      <div className="erp-hover-preview__footer">Click the record for complete details</div>
    </aside>,
    document.body
  );
}
