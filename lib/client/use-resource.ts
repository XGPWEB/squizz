"use client";
import { useCallback, useEffect, useState } from "react";
import { getJson } from "./api";

/**
 * Loads JSON from an API route on mount (state is only set once the response arrives, and never
 * after unmount). `reload()` fetches again after an action and resolves when the data is fresh.
 */
export function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    getJson<T>(url)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [url]);
  const reload = useCallback(async () => {
    const d = await getJson<T>(url);
    setData(d);
    return d;
  }, [url]);
  return { data, error, reload };
}
