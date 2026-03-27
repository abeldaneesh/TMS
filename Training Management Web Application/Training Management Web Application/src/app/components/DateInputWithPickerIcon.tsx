import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { Input } from './ui/input';
import { cn } from './ui/utils';

interface DateInputWithPickerIconProps extends React.ComponentProps<typeof Input> {
  wrapperClassName?: string;
  buttonClassName?: string;
}

const DateInputWithPickerIcon: React.FC<DateInputWithPickerIconProps> = ({
  wrapperClassName,
  buttonClassName,
  className,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
  };

  return (
    <div className={cn('relative', wrapperClassName)}>
      <button
        type="button"
        onClick={openDatePicker}
        aria-label="Open date picker"
        className={cn(
          'absolute left-3 top-1/2 z-10 flex size-5 -translate-y-1/2 items-center justify-center text-foreground/85 transition-colors hover:text-foreground',
          buttonClassName,
        )}
      >
        <Calendar className="size-4" />
      </button>
      <Input
        ref={inputRef}
        type="date"
        className={cn('date-input-with-leading-icon pl-10', className)}
        {...props}
      />
    </div>
  );
};

export default DateInputWithPickerIcon;
