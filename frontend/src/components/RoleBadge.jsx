const STYLES = {
  admin: 'bg-warn/10 text-warn border-warn/30',
  doctor: 'bg-clinical-100 text-clinical-700 border-clinical-300',
  patient: 'bg-line text-muted border-line',
};

export default function RoleBadge({ role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STYLES[role] || STYLES.patient}`}
    >
      {role}
    </span>
  );
}
