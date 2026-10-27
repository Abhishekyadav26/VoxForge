import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes (used by Magic UI components). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}