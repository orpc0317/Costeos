import React from 'react';

interface NumericInputProps {
  value: number | undefined;
  onChange: (val: number | undefined) => void;
  className?: string;
  min?: string;
  max?: string;
  placeholder?: string;
}

/**
 * NumericInput
 * 
 * Componente que reemplaza a <input type="number">.
 * Resuelve el "síndrome del punto decimal fantasma" en React, permitiendo ingresar 
 * números decimales de forma fluida, y manteniendo un valor string intermedio 
 * mientras se despacha el número limpio al estado global.
 */
export const NumericInput = ({ value, onChange, className, min, max, placeholder }: NumericInputProps) => {
  const [localValue, setLocalValue] = React.useState(value === undefined ? '' : value.toString());

  React.useEffect(() => {
    const valueStr = value === undefined ? '' : value.toString();
    if (parseFloat(localValue) !== value && localValue !== valueStr + '.') {
      setLocalValue(valueStr);
    }
  }, [value, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
      val = val.replace(/^0+/, '');
    }
    
    if (!/^-?\d*\.?\d*$/.test(val)) return;

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

  const handleBlur = () => {
    if (localValue.endsWith('.') || localValue === '-' || localValue === '-.') {
      const parsed = parseFloat(localValue);
      onChange(isNaN(parsed) ? undefined : parsed);
      setLocalValue(isNaN(parsed) ? '' : parsed.toString());
    }
    if (localValue === '') {
      setLocalValue('');
    }
  };

  return (
    <input 
      type="text" 
      inputMode="decimal"
      className={className}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      max={max}
      placeholder={placeholder}
    />
  );
};
