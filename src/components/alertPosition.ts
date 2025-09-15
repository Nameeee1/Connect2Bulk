import type { AlertPosition } from './Alert';

export function regionPositionCSS(pos: AlertPosition): string {
  switch (pos) {
    case 'top-left':
      return 'top: 16px; left: 16px; align-items: flex-start;';
    case 'bottom-right':
      return 'bottom: 16px; right: 16px; align-items: flex-end;';
    case 'bottom-left':
      return 'bottom: 16px; left: 16px; align-items: flex-start;';
    case 'top-center':
      return 'top: 16px; left: 50%; transform: translateX(-50%); align-items: center;';
    case 'bottom-center':
      return 'bottom: 16px; left: 50%; transform: translateX(-50%); align-items: center;';
    case 'top-right':
    default:
      return 'top: 16px; right: 16px; align-items: flex-end;';
  }
}
