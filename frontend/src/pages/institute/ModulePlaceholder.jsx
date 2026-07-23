export function ModulePlaceholder({
  title = "Module",
  description = "Dashboard route and permission boundary are active. Full module implementation is coming next."
}) {
  return (
    <div className="module-placeholder-page">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export default ModulePlaceholder;
