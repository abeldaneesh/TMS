import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { Input } from './ui/input';
import { cn } from './ui/utils';

interface DateInputWithPickerIconProps extends React.ComponentProps<typeof Input> {
  wrapperClassName?: string;
  buttonClassName?: string;
  iconPosition?: 'leading' | 'trailing';
}

const DateInputWithPickerIcon: React.FC<DateInputWithPickerIconProps> = ({
  wrapperClassName,
  buttonClassName,
  className,
  iconPosition = 'leading',
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
          'absolute top-1/2 z-10 flex size-5 -translate-y-1/2 items-center justify-center text-foreground/85 transition-colors hover:text-foreground',
          iconPosition === 'leading' ? 'left-3' : 'right-3',
          buttonClassName,
        )}
      >
        <Calendar className="size-4" />
      </button>
      <Input
        ref={inputRef}
        type="date"
        className={cn(
          'date-input-with-leading-icon',
          iconPosition === 'leading' ? 'pl-10' : 'pr-10',
          className,
        )}
        {...props}
      />
    </div>
  );
};

export default DateInputWithPickerIcon;
