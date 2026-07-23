export function BillLogo({ bill, small = false }) {
  return (
    <div
      className={`bill-logo ${small ? "small" : ""}`}
      style={{ background: bill.color }}
    >
      {bill.symbol || bill.name.slice(0, 1)}
    </div>
  );
}
