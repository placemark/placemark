import { useQuery } from "@blitzjs/rpc";
import { DotFilledIcon, ReaderIcon } from "@radix-ui/react-icons";
import getBlog from "app/users/queries/getBlog";
import { styledButton, StyledTooltipArrow, TContent } from "./elements";
import * as T from "@radix-ui/react-tooltip";

export function News() {
  const [blog] = useQuery(getBlog, null);
  if (blog) {
    return (
      <T.Root delayDuration={0}>
        <T.Trigger asChild>
          <a
            className={styledButton({ variant: "quiet" })}
            target="_blank"
            rel="noreferrer"
            href={blog.link}
          >
            <ReaderIcon />
            <DotFilledIcon className="text-purple-300" />
          </a>
        </T.Trigger>
        <TContent>
          <StyledTooltipArrow />
          <div>Read new blog post</div>
          <div className="font-bold whitespace-nowrap pt-1">{blog.title}</div>
        </TContent>
      </T.Root>
    );
  }
  return null;
}
