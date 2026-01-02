import React from 'react';
import { Input } from '@/components/ui/input';

interface UppercaseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UppercaseInput = React.forwardRef<HTMLInputElement, UppercaseInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.target.value = e.target.value.toUpperCase();
      onChange(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        value={value}
        onChange={handleChange}
        className={`uppercase ${className}`}
        {...props}
      />
    );
  }
);
