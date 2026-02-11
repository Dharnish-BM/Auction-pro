import { motion } from 'framer-motion';

export const Loader = ({ size = 'medium', fullScreen = false }) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-10 h-10',
    large: 'w-16 h-16'
  };

  const loaderContent = (
    <div className="relative">
      <motion.div
        className={`${sizeClasses[size]} rounded-full border-4 border-sports-border`}
        style={{ borderTopColor: '#00ff88' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-4 border-transparent`}
        style={{ borderBottomColor: '#ffd700' }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sports-dark">
        <div className="text-center">
          {loaderContent}
          <p className="mt-4 text-gray-400 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return loaderContent;
};

export const SkeletonCard = () => (
  <div className="sports-card animate-pulse">
    <div className="h-48 bg-sports-border rounded-lg mb-4" />
    <div className="h-6 bg-sports-border rounded w-3/4 mb-2" />
    <div className="h-4 bg-sports-border rounded w-1/2" />
  </div>
);

export const SkeletonText = ({ lines = 3 }) => (
  <div className="space-y-2 animate-pulse">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-4 bg-sports-border rounded"
        style={{ width: `${Math.random() * 40 + 60}%` }}
      />
    ))}
  </div>
);
