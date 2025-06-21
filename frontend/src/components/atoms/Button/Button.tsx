import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { BaseProps } from '@/types/common';

export interface ButtonProps extends BaseProps, Omit<MuiButtonProps, 'css'> {
  isLoading?: boolean;
}

const StyledButton = styled(MuiButton)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  textTransform: 'none',
  '&.MuiButton-contained': {
    boxShadow: 'none',
    '&:hover': {
      boxShadow: 'none',
    },
  },
}));

export const Button = ({ 
  children, 
  isLoading, 
  disabled, 
  ...props 
}: ButtonProps) => {
  return (
    <StyledButton
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </StyledButton>
  );
}; 