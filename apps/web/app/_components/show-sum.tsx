'use client';

import { useSum } from './sum-button';

export function ShowSum() {
  const { value } = useSum();
  console.log('render ShowSum');
  return (
    <div>
      <span>Sum</span>:<span>{value}</span>
    </div>
  );
}
