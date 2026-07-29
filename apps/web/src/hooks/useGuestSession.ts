"use client";

export function getGuestKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem("doczen:guest:init");
  if (!key) {
    key = "1";
    localStorage.setItem("doczen:guest:init", key);
  }
  return key;
}

export function hasGuestSession(): boolean {
  return getGuestKey() !== "";
}
