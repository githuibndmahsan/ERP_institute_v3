export function RecordPagination({
  totalRecords,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  label = "records"
}) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = totalRecords ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(safePage * pageSize, totalRecords);

  return (
    <div className="enterprise-pagination no-print">
      <div className="enterprise-pagination-summary">
        Showing {start}–{end} of {totalRecords} {label}
      </div>

      <div className="enterprise-pagination-controls">
        <label>
          Rows
          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value))
            }
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </button>

        <span>
          Page {safePage} of {totalPages}
        </span>

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default RecordPagination;
