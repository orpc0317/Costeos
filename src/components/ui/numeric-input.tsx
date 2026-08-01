import React from 'react';
import { Input } from './input';

interface NumericInputProps {
  value: number | undefined;
  onChange: (val: number | undefined) => void;
  className?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  isInteger?: boolean;
  'aria-invalid'?: boolean | 'true' | 'false';
}

/**
 * NumericInput
 * 
 * Componente que reemplaza a <input type="number">.
 * Resuelve el "síndrome del punto decimal fantasma" en React, permitiendo ingresar 
 * números decimales de forma fluida, y manteniendo un valor string intermedio 
 * mientras se despacha el número limpio al estado global.
 */
export const NumericInput = ({ 
  value, 
  onChange, 
  className, 
  min, 
  max, 
  placeholder, 
  isInteger = false, 
  'aria-invalid': ariaInvalid,
  ...rest
}: NumericInputProps & Omit<React.ComponentProps<"input">, "onChange" | "value">) => {
  const [localValue, setLocalValue] = React.useState(value === undefined ? '' : value.toString());
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    const valueStr = value === undefined ? '' : value.toString();
    // Solo actualizamos el valor local desde afuera si no estamos enfocados, 
    // o si el valor externo cambió y no coincide con nuestra interpretación local.
    if (!isFocused && parseFloat(localValue) !== value && localValue !== valueStr + '.') {
      setLocalValue(valueStr);
    }
  }, [value, localValue, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
      val = val.replace(/^0+/, '');
    }
    
    if (isInteger) {
      if (!/^-?\d*$/.test(val)) return;
    } else {
      if (!/^-?\d*\.?\d*$/.test(val)) return;
    }

    setLocalValue(val);
    
    if (val !== '' && !val.endsWith('.') && val !== '-' && val !== '-.') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    } else if (val === '' || val === '-') {
      onChange(undefined);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    rest.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (localValue.endsWith('.') || localValue === '-' || localValue === '-.') {
      const parsed = parseFloat(localValue);
      onChange(isNaN(parsed) ? undefined : parsed);
      setLocalValue(isNaN(parsed) ? '' : parsed.toString());
    }
    if (localValue === '') {
      setLocalValue('');
    }
    rest.onBlur?.(e);
  };

  const displayValue = React.useMemo(() => {
    if (isFocused) return localValue;
    if (value === undefined || isNaN(value)) return localValue === '' ? '' : localValue;
    
    try {
      if (isInteger) {
        return new Intl.NumberFormat('en-US', {
          maximumFractionDigits: 0,
        }).format(value);
      } else {
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        }).format(value);
      }
    } catch (e) {
      return value.toString();
    }
  }, [isFocused, localValue, value, isInteger]);

  return (
    <Input 
      type="text" 
      inputMode={isInteger ? "numeric" : "decimal"}
      className={className}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      min={min}
      max={max}
      placeholder={placeholder}
      aria-invalid={ariaInvalid}
      {...rest}
    />
  );
};
