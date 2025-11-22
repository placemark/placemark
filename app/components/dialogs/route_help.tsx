import { CommitIcon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { styledInlineA } from "../elements";

export function RouteHelpDialog() {
  return (
    <>
      <DialogHeader title="Route help" titleIcon={CommitIcon} />
      <div>
        <p>
          Routing is a beta feature! Please leave feedback and consider{" "}
          <a
            href="https://github.com/placemark/placemark"
            className={styledInlineA}
          >
            helping out with development
          </a>{" "}
          of this.
        </p>
        <p className="mt-2">
          Draw a route by clicking <CommitIcon className="w-4 inline-block" />{" "}
          and clicking on the map to add a waypoint. Using the menu to the right
          of the block, you can customize whether the route using walking,
          driving, or cycling profiles.
        </p>
        <p className="mt-2">
          Routes are represented as GeometryCollection objects with points for
          waypoints and a linestring for the route. They're currently generated
          by the{" "}
          <a
            href="https://docs.mapbox.com/api/navigation/directions/"
            className={styledInlineA}
          >
            Mapbox Directions API
          </a>
          . Additional routing providers would be welcomed - please contribute
          to the open source project if this is a priority for you.
        </p>
        <p>
          <h2 className="mt-8 font-bold">Known limitations</h2>
          <ul className="list-disc ml-6 mt-2">
            <li>
              You can't add control points to the middle of routes, or extend
              routes once they've been drawn.
            </li>
            <li>
              Other than doing 'Split GeometryCollection', there is not a very
              intuitive way to turn a route into a normal LineString.
            </li>
          </ul>
        </p>
      </div>
    </>
  );
}
