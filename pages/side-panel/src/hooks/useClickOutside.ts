import { useEffect } from 'react';

export function useClickOutside(
  showCondition: boolean,
  selector: string,
  onClickOutside: () => void
) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showCondition && !target.closest(selector)) {
        onClickOutside();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCondition, selector, onClickOutside]);
}
