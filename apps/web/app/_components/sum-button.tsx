'use client';

import { qsParserInteger } from '@query-state/core';
import { useQState } from '@query-state/next';

export const SumButton = () => {
  const { setSum } = useSum();
  console.log('render SumButton');
  return <button onClick={() => setSum((prev) => prev + 1)}>Somar</button>;
};

export const useSum = () => {
  const [value, setSum] = useQState('sum', qsParserInteger.setDefault(0));

  return {
    value,
    setSum,
  };
};
