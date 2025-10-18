'use client';
import { useQState } from '@qstate/next';
import Image from 'next/image';

export function ButtonTest() {
  const [value, setValue] = useQState('rotate', false, { shallow: true });
  console.log('render ButtonTest');
  return (
    <button
      onClick={() => setValue(!value)}
      className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
    >
      <Image
        data-rotate={value}
        className="dark:invert data-[rotate='true']:rotate-180 ease-in-out duration-300"
        src="/vercel.svg"
        alt="Vercel logomark"
        width={20}
        height={20}
      />
      Deploy now
    </button>
  );
}
