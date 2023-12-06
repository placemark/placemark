import { BlitzProvider, RouterContext } from "@blitzjs/next";
import { render as defaultRender } from "@testing-library/react";
import { vi } from "vitest";
import {
  renderHook as defaultRenderHook,
  act as actHook,
} from "@testing-library/react-hooks";

export { actHook };
export * from "@testing-library/react";

const defaultWrapper =
  (router: Partial<any> | undefined) =>
  ({ children }: { children?: React.ReactNode }) =>
    (
      <BlitzProvider>
        <RouterContext.Provider value={{ ...mockRouter, ...router }}>
          {children}
        </RouterContext.Provider>
      </BlitzProvider>
    );

// --------------------------------------------------------------------------------
// This file customizes the render() and renderHook() test functions provided
// by React testing library. It adds a router context wrapper with a mocked router.
//
// You should always import `render` and `renderHook` from this file
//
// This is the place to add any other context providers you need while testing.
// --------------------------------------------------------------------------------

function makeRender<T>(renderMethod: any) {
  return function render(
    ui: T,
    { wrapper, router, ...options }: RenderOptions = {}
  ) {
    if (!wrapper) wrapper = defaultWrapper(router);
    // eslint-disable-next-line
    return renderMethod(ui, { wrapper, ...options });
  };
}

// --------------------------------------------------
// render()
// --------------------------------------------------
// Override the default test render with our own
//
// You can override the router mock like this:
//
// const { baseElement } = render(<MyComponent />, {
//   router: { pathname: '/my-custom-pathname' },
// });
// --------------------------------------------------
export const render = makeRender<RenderUI>(defaultRender);

// --------------------------------------------------
// renderHook()
// --------------------------------------------------
// Override the default test renderHook with our own
//
// You can override the router mock like this:
//
// const result = renderHook(() => myHook(), {
//   router: { pathname: '/my-custom-pathname' },
// });
// --------------------------------------------------
export const renderHook = makeRender<RenderHook>(defaultRenderHook);

export const mockRouter = {
  basePath: "",
  pathname: "/",
  route: "/",
  asPath: "/",
  params: {},
  query: {},
  isReady: true,
  isLocaleDomain: false,
  isPreview: false,
  push: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
  beforePopState: vi.fn(),
  forward: vi.fn(),
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
  isFallback: false,
};

type DefaultParams = Parameters<typeof defaultRender>;
type RenderUI = DefaultParams[0];
type RenderOptions = DefaultParams[1] & { router?: typeof mockRouter };

type DefaultHookParams = Parameters<typeof defaultRenderHook>;
type RenderHook = DefaultHookParams[0];
