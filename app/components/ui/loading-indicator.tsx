import React from 'react';
import { useTheme } from 'remix-themes';
import csslLoading from '~/assets/cssl-loading.gif';
import csslLoadingAlt from '~/assets/cssl-loading-alt.gif';

interface LoadingIndicatorProps {
    message: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message }) => {
  const [theme] = useTheme();
  return (
    <div className="flex flex-row gap-2 text-xs items-center">
      <img src={theme === 'dark' ? csslLoading : csslLoadingAlt} className="w-6 h-6" alt="Loading spinner" />
      {message}
    </div>
  );
};

export default LoadingIndicator;
