import React, { useRef, useImperativeHandle } from 'react';
import { Input } from '@/components/ui/input';

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: 'placa' | 'phone';
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onChange, onKeyDown, className, ...props }, ref) => {
    const internalRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const formatValue = (val: string) => {
      if (mask === 'placa') {
        // Remove tudo que não é letra ou número
        const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const limited = clean.slice(0, 7);

        // Lógica para detectar Mercosul vs Antiga
        // Antiga: LLLNNNN (4º caractere é número, 5º é número) -> Mascara: LLL-NNNN
        // Mercosul: LLLNLNN (4º caractere é número, 5º é letra) -> Sem Mascara (ou formato próprio)

        if (limited.length > 4) {
          const fifthChar = limited[4];
          const isMercosul = isNaN(parseInt(fifthChar)); // Se 5º char for letra, é Mercosul

          if (isMercosul) {
            return limited;
          }
        }

        // Se não for detectado como Mercosul, aplica a máscara antiga (padrão)
        if (limited.length > 3) {
          return `${limited.slice(0, 3)}-${limited.slice(3)}`;
        }

        return limited;
      }
      if (mask === 'phone') {
        let v = val.replace(/\D/g, '');
        v = v.slice(0, 11);

        if (v.length > 10) {
          return v.replace(/^(\d\d)(\d{5})(\d{4})/, '($1) $2-$3');
        } else {
          return v
            .replace(/^(\d\d)(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
        }
      }
      return val;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatValue(e.target.value);
      onChange(formatted);
    };

    return (
      <Input
        ref={internalRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        className={className}
        {...props}
      />
    );
  }
);
