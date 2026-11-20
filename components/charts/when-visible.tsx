"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Рендерит children, только когда блок приблизился к экрану (за 300px).
 * Графики ниже первого экрана не тратят процессор, пока до них не
 * прокрутили, — заметно на слабых телефонах. До этого — заглушка того же
 * размера, без прыжка разметки.
 */
export function WhenVisible({
  children,
  placeholder,
}: {
  children: React.ReactNode;
  placeholder: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- старые браузеры: показываем сразу
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{visible ? children : placeholder}</div>;
}
