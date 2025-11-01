// 临时移除不存在的导入
// import { ImageWithFallback } from './figma/ImageWithFallback';
// import logoImage from 'figma:asset/ad4885f4d5a3f84cf31157cce16f281d89e6fea9.png';

interface AILogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

export function AILogo({ size = 'md', className = '', animate = false }: AILogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0 ${animate ? 'animate-pulse' : ''} ${className}`}
    >
      <span className="text-white font-bold text-lg">🤖</span>
    </div>
  );
}
