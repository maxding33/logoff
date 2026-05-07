"use client";

import { createContext, useContext, MutableRefObject } from "react";

type PageContextType = {
  pageIndex: number;
  setPageIndex: (index: number) => void;
  gestureClaimedBy: MutableRefObject<string | null>;
};

export const PageContext = createContext<PageContextType>({
  pageIndex: 0,
  setPageIndex: () => {},
  gestureClaimedBy: { current: null },
});

export function usePageContext() {
  return useContext(PageContext);
}
