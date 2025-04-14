import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-medium py-3 px-6 rounded transition-colors duration-200';
  
  const variantStyles = {
    primary: 'bg-black hover:bg-gray-900 text-white',
    secondary: 'border border-gray-300 hover:border-gray-400 text-gray-700',
    accent: 'bg-[#F47B3E] hover:bg-[#E06A2D] text-white',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button; 