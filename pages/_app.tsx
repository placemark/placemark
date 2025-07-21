import "../styles/globals.css";
import { Tooltip as T } from "radix-ui";
import { QueryClientProvider, QueryClient } from "react-query";
import "core-js/features/array/at";

const RouterProgressBar = () =>
	import("app/components/router_progress_bar").then((m) => m.RouterProgressBar);

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: any) {
	return (
		<QueryClientProvider client={queryClient}>
			<T.Provider>
				<RouterProgressBar />
				<Component {...pageProps} />
			</T.Provider>
		</QueryClientProvider>
	);
}
