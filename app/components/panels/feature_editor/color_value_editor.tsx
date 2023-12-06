import { Button, inputClass } from "app/components/elements";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { PropertyPair } from "./property_row";
import * as d3 from "d3-color";
import { JsonValue } from "type-fest";

/**
 * Mainly a color picker.
 */
export function ColorValueEditor({
  pair,
  onChangeValue,
}: {
  pair: PropertyPair;
  onChangeValue: (arg0: JsonValue) => void;
}) {
  const [, value] = pair;

  const asHex = typeof value === "string" && d3.color(value)?.formatHex();

  if (asHex) {
    const color = value;
    return (
      <div className="space-y-2">
        <div className="border border-white" style={{ borderRadius: 5 }}>
          <HexColorPicker
            style={{
              width: "100%",
            }}
            color={color}
            onChange={onChangeValue}
          />
        </div>
        <HexColorInput
          className={inputClass({})}
          prefixed
          color={color}
          onChange={onChangeValue}
        />
      </div>
    );
  }
  return (
    <div
      className="block w-full
        text-sm
        h-32
        px-4
        border-gray-300 dark:border-gray-600 rounded
        flex items-center justify-center
        dark:bg-gray-800 dark:text-white"
    >
      <div>
        This value can’t be parsed as a color. Edit it in another mode, or{" "}
        <Button
          onClick={() => {
            onChangeValue("#ff0000");
          }}
        >
          start with red.
        </Button>
      </div>
    </div>
  );
}
