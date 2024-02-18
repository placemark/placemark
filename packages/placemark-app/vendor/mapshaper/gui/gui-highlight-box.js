import { El } from "./gui-el";

export function HighlightBox() {
  var box = El("div").addClass("zoom-box").appendTo("body"),
    show = box.show.bind(box), // original show() function
    stroke = 2;
  box.hide();
  box.show = function (x1, y1, x2, y2) {
    var w = Math.abs(x1 - x2),
      h = Math.abs(y1 - y2);
    box.css({
      top: Math.min(y1, y2),
      left: Math.min(x1, x2),
      width: Math.max(w - stroke * 2, 1),
      height: Math.max(h - stroke * 2, 1),
    });
    show();
  };
  return box;
}
