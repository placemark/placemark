import { detectCompatibility } from "app/lib/detect_compatibility";
import { useQuery } from "react-query";
import { TextWell } from "./elements";

export function CompatibilityCheck() {
  const compatible = useQuery("compatibility", () => {
    return detectCompatibility();
  });

  return compatible ? null : (
    <div className="pb-4">
      <TextWell variant="destructive">
        It appears that your browser does not support Local Storage or another
        technology required to run Placemark. This can be the result of running
        Firefox in Private mode or using an outdated iOS.
        <div className="pt-1">
          See{" "}
          <a
            className="underline font-bold"
            href="https://www.placemark.io/documentation/system-requirements"
          >
            System requirements
          </a>{" "}
          for more detail.
        </div>
      </TextWell>
    </div>
  );
}
