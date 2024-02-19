import "../styles/globals.css";
import * as T from "@radix-ui/react-tooltip";
import { QueryClientProvider, QueryClient } from "react-query";
import dynamic from "next/dynamic";
import "core-js/features/array/at";

const RouterProgressBar = dynamic(
  () =>
    import("app/components/router_progress_bar").then(
      (m) => m.RouterProgressBar
    ),
  {
    ssr: false,
  }
);

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  const getLayout = Component.getLayout || ((page) => page);

  return (
    <QueryClientProvider client={queryClient}>
      <T.Provider>
        <RouterProgressBar />
        {getLayout(<Component {...pageProps} />)}
      </T.Provider>
    </QueryClientProvider>
  );
}
