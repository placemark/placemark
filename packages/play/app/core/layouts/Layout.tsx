import type { LayoutProps } from "./shared";
import { LayoutHead } from "./shared";

const Layout = ({ title, children }: LayoutProps) => {
  return (
    <>
      <LayoutHead title={title || ""} />
      {children}
      <script
        data-goatcounter="https://placemark.goatcounter.com/count"
        async
        src="//gc.zgo.at/count.js"
      ></script>
    </>
  );
};

export default Layout;
