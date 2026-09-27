"use client";

import { useId } from "react";
import "./EYNFill.css";

/** Original traced EYN geometry. Fills once on mount; stays complete. */
export default function EYNFill({
  size = 160,
  theme = "light",
  className,
}: {
  size?: number;
  theme?: "light" | "dark";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const topClip = `eyn-top-${id}`;
  const bottomClip = `eyn-bottom-${id}`;
  return (
    <svg
      className={["eyn-fill", className].filter(Boolean).join(" ")}
      viewBox="0 0 1254 1254"
      width={size}
      height={size}
      style={{ color: "var(--ink)" }}
      role="img"
      aria-label="EYN"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={topClip} clipPathUnits="userSpaceOnUse">
          <rect className="eyn-fill__sweep eyn-fill__sweep--top" x="179.53" y="306.29" width="967.20" height="382.19" />
        </clipPath>
        <clipPath id={bottomClip} clipPathUnits="userSpaceOnUse">
          <rect className="eyn-fill__sweep eyn-fill__sweep--bottom" x="142.50" y="692.76" width="881.06" height="316.54" />
        </clipPath>
      </defs>
      <path data-piece="top" fill="currentColor" clipPath={`url(#${topClip})`} d="M824.50,307.50 L661.50,307.64 L629.50,308.68 L598.50,313.04 L573.50,318.90 L541.50,330.38 L517.50,342.23 L503.50,351.11 L489.50,361.30 L476.50,371.96 L462.44,385.50 L308.50,548.90 L180.53,686.50 L181.50,687.48 L189.50,686.72 L206.50,682.74 L215.50,679.90 L230.50,673.81 L259.50,659.43 L277.50,651.43 L300.50,642.26 L317.50,636.37 L354.50,626.15 L377.50,621.21 L395.50,618.32 L438.50,613.36 L487.50,611.01 L526.50,610.26 L734.50,609.84 L760.50,609.19 L783.50,606.74 L798.50,603.55 L809.50,600.75 L827.50,594.59 L849.50,584.80 L865.50,575.54 L882.50,563.72 L897.50,551.59 L921.50,528.79 L1145.73,308.50 L1145.50,307.50 L1126.50,307.29 Z" />
      <path data-piece="bottom" fill="currentColor" clipPath={`url(#${bottomClip})`} d="M577.50,694.46 L541.50,696.62 L523.50,698.77 L507.50,701.42 L487.50,706.44 L475.50,710.38 L451.50,720.07 L425.50,734.00 L414.50,741.31 L397.50,753.98 L378.50,771.08 L196.50,953.68 L143.50,1007.74 L197.50,1008.30 L598.50,1007.89 L617.50,1006.79 L640.50,1003.81 L661.50,998.99 L682.27,992.50 L705.50,982.67 L720.50,974.74 L736.50,964.70 L755.50,949.99 L846.50,863.61 L936.50,776.42 L1022.56,694.50 L1021.50,693.90 L960.50,693.76 L596.50,693.88 Z" />
    </svg>
  );
}
