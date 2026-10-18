import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors } from "@/constants/colors";

type CircularProgressProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  value?: string;
};

export function CircularProgress({
  progress,
  size = 96,
  strokeWidth = 9,
  color = colors.primary,
  trackColor = colors.border,
  label,
  value,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      {value ? <Text className="text-xl font-bold text-text">{value}</Text> : null}
      {label ? <Text className="text-[10px] text-muted">{label}</Text> : null}
    </View>
  );
}
