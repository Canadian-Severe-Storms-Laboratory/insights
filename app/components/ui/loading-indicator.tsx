import React from 'react';
import csslLoading from '~/assets/cssl-loading.gif';

interface LoadingIndicatorProps {
    message: string;
}

// TODO: Light mode
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message }) => {
  return (
    <div className="flex flex-row gap-2 text-xs items-center">
      <img src={csslLoading} className="w-6 h-6" alt="Loading spinner" />
      {message}
    </div>
  );
};

export default LoadingIndicator;
