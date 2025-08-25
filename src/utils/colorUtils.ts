/**
 * Utility functions for converting Tailwind color classes to hex codes
 */

const tailwindColorMap: Record<string, string> = {
  // Blue colors
  'bg-blue-50': '#eff6ff',
  'bg-blue-100': '#dbeafe',
  'bg-blue-200': '#bfdbfe',
  'bg-blue-300': '#93c5fd',
  'bg-blue-400': '#60a5fa',
  'bg-blue-500': '#3b82f6',
  'bg-blue-600': '#2563eb',
  'bg-blue-700': '#1d4ed8',
  'bg-blue-800': '#1e40af',
  'bg-blue-900': '#1e3a8a',
  
  // Gray colors
  'bg-gray-50': '#f9fafb',
  'bg-gray-100': '#f3f4f6',
  'bg-gray-200': '#e5e7eb',
  'bg-gray-300': '#d1d5db',
  'bg-gray-400': '#9ca3af',
  'bg-gray-500': '#6b7280',
  'bg-gray-600': '#4b5563',
  'bg-gray-700': '#374151',
  'bg-gray-800': '#1f2937',
  'bg-gray-900': '#111827',
  
  // Green colors
  'bg-green-50': '#f0fdf4',
  'bg-green-100': '#dcfce7',
  'bg-green-200': '#bbf7d0',
  'bg-green-300': '#86efac',
  'bg-green-400': '#4ade80',
  'bg-green-500': '#22c55e',
  'bg-green-600': '#16a34a',
  'bg-green-700': '#15803d',
  'bg-green-800': '#166534',
  'bg-green-900': '#14532d',
  
  // Red colors
  'bg-red-50': '#fef2f2',
  'bg-red-100': '#fee2e2',
  'bg-red-200': '#fecaca',
  'bg-red-300': '#fca5a5',
  'bg-red-400': '#f87171',
  'bg-red-500': '#ef4444',
  'bg-red-600': '#dc2626',
  'bg-red-700': '#b91c1c',
  'bg-red-800': '#991b1b',
  'bg-red-900': '#7f1d1d',
  
  // Yellow colors
  'bg-yellow-50': '#fffbeb',
  'bg-yellow-100': '#fef3c7',
  'bg-yellow-200': '#fde68a',
  'bg-yellow-300': '#fcd34d',
  'bg-yellow-400': '#fbbf24',
  'bg-yellow-500': '#f59e0b',
  'bg-yellow-600': '#d97706',
  'bg-yellow-700': '#b45309',
  'bg-yellow-800': '#92400e',
  'bg-yellow-900': '#78350f',
  
  // Purple colors
  'bg-purple-50': '#faf5ff',
  'bg-purple-100': '#f3e8ff',
  'bg-purple-200': '#e9d5ff',
  'bg-purple-300': '#d8b4fe',
  'bg-purple-400': '#c084fc',
  'bg-purple-500': '#a855f7',
  'bg-purple-600': '#9333ea',
  'bg-purple-700': '#7c3aed',
  'bg-purple-800': '#6b21a8',
  'bg-purple-900': '#581c87',
  
  // Indigo colors
  'bg-indigo-50': '#eef2ff',
  'bg-indigo-100': '#e0e7ff',
  'bg-indigo-200': '#c7d2fe',
  'bg-indigo-300': '#a5b4fc',
  'bg-indigo-400': '#818cf8',
  'bg-indigo-500': '#6366f1',
  'bg-indigo-600': '#4f46e5',
  'bg-indigo-700': '#4338ca',
  'bg-indigo-800': '#3730a3',
  'bg-indigo-900': '#312e81',
  
  // Pink colors
  'bg-pink-50': '#fdf2f8',
  'bg-pink-100': '#fce7f3',
  'bg-pink-200': '#fbcfe8',
  'bg-pink-300': '#f9a8d4',
  'bg-pink-400': '#f472b6',
  'bg-pink-500': '#ec4899',
  'bg-pink-600': '#db2777',
  'bg-pink-700': '#be185d',
  'bg-pink-800': '#9d174d',
  'bg-pink-900': '#831843',
  
  // Teal colors
  'bg-teal-50': '#f0fdfa',
  'bg-teal-100': '#ccfbf1',
  'bg-teal-200': '#99f6e4',
  'bg-teal-300': '#5eead4',
  'bg-teal-400': '#2dd4bf',
  'bg-teal-500': '#14b8a6',
  'bg-teal-600': '#0d9488',
  'bg-teal-700': '#0f766e',
  'bg-teal-800': '#115e59',
  'bg-teal-900': '#134e4a',
  
  // Orange colors
  'bg-orange-50': '#fff7ed',
  'bg-orange-100': '#ffedd5',
  'bg-orange-200': '#fed7aa',
  'bg-orange-300': '#fdba74',
  'bg-orange-400': '#fb923c',
  'bg-orange-500': '#f97316',
  'bg-orange-600': '#ea580c',
  'bg-orange-700': '#c2410c',
  'bg-orange-800': '#9a3412',
  'bg-orange-900': '#7c2d12',
};

/**
 * Converts a Tailwind color class to its hex equivalent
 * @param color - The color value (could be Tailwind class or hex)
 * @returns The hex color code
 */
export function convertTailwindColorToHex(color: string): string {
  // If it's already a hex color, return as is
  if (color.startsWith('#')) {
    return color;
  }
  
  // If it's a Tailwind class, convert it
  if (tailwindColorMap[color]) {
    return tailwindColorMap[color];
  }
  
  // Try to extract color from various Tailwind formats
  // Handle cases like "blue-500" without the "bg-" prefix
  if (color.includes('-') && !color.startsWith('bg-')) {
    const withBgPrefix = `bg-${color}`;
    if (tailwindColorMap[withBgPrefix]) {
      return tailwindColorMap[withBgPrefix];
    }
  }
  
  // Default fallback color (gray-500)
  return '#6b7280';
}

/**
 * Gets a lighter version of a color for backgrounds
 * @param baseColor - The base color
 * @returns A lighter hex color
 */
export function getLighterColor(baseColor: string): string {
  const hex = convertTailwindColorToHex(baseColor);
  
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Make it lighter by blending with white (increase brightness)
  const lighterR = Math.min(255, Math.floor(r + (255 - r) * 0.7));
  const lighterG = Math.min(255, Math.floor(g + (255 - g) * 0.7));
  const lighterB = Math.min(255, Math.floor(b + (255 - b) * 0.7));
  
  // Convert back to hex
  return `#${lighterR.toString(16).padStart(2, '0')}${lighterG.toString(16).padStart(2, '0')}${lighterB.toString(16).padStart(2, '0')}`;
}