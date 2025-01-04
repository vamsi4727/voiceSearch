import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const StatusIndicator = ({ status, message }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'recording':
        return {
          containerClass: 'bg-red-100 border-red-400',
          textClass: 'text-red-700',
          pulse: true
        };
      case 'processing':
        return {
          containerClass: 'bg-yellow-100 border-yellow-400',
          textClass: 'text-yellow-700',
          pulse: true
        };
      case 'success':
        return {
          containerClass: 'bg-green-100 border-green-400',
          textClass: 'text-green-700',
          pulse: false
        };
      case 'error':
        return {
          containerClass: 'bg-red-100 border-red-400',
          textClass: 'text-red-700',
          pulse: false
        };
      default:
        return {
          containerClass: 'bg-gray-100 border-gray-400',
          textClass: 'text-gray-700',
          pulse: false
        };
    }
  };

  const { containerClass, textClass, pulse } = getStatusStyles();

  return (
    <div className={`flex items-center ${containerClass} border px-4 py-2 rounded-full`}>
      {pulse && (
        <span className="relative flex h-3 w-3 mr-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
      {status === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />}
      {status === 'error' && <XCircleIcon className="w-5 h-5 text-red-500 mr-2" />}
      <span className={`text-sm ${textClass}`}>{message}</span>
    </div>
  );
};

export default StatusIndicator;
