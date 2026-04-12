interface SubmitButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export default function SubmitButton({
  label,
  onClick,
  disabled,
}: SubmitButtonProps) {
  return (
    <div className="w-full pt-2">
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full cursor-pointer rounded-2xl bg-[var(--orange)] px-6 py-4 text-center text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
      </button>
    </div>
  );
}
