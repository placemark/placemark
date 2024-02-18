import { WriteFilesProxy, ImportFileProxy } from "./gui-proxy";
import { SessionHistory } from "./gui-session-history";
import { SidebarButtons } from "./gui-sidebar-buttons";
import { ModeSwitcher } from "./gui-modes";
import { KeyboardEvents } from "./gui-keyboard";
import { InteractionMode } from "./gui-interaction-mode-control";
import { Model } from "./gui-model";
import { MshpMap } from "./gui-map";
import { utils } from "./gui-core";
import { El } from "./gui-el";
import { GUI } from "./gui-lib";
import { MessageProxy } from "./gui-proxy";

export function GuiInstance(container, opts) {
  var gui = new ModeSwitcher();
  opts = utils.extend(
    {
      // defaults
      homeControl: true,
      zoomControl: true,
      inspectorControl: true,
      disableNavigation: false,
      showMouseCoordinates: true,
      focus: true,
    },
    opts
  );

  gui.options = opts;
  gui.container = El(container);
  gui.model = new Model(gui);
  gui.keyboard = new KeyboardEvents(gui);
  gui.buttons = new SidebarButtons(gui);
  gui.map = new MshpMap(gui);
  gui.interaction = new InteractionMode(gui);
  gui.session = new SessionHistory(gui);

  gui.showProgressMessage = function (msg) {
    if (!gui.progressMessage) {
      gui.progressMessage = El("div")
        .addClass("progress-message")
        .appendTo("body");
    }
    El("<div>").text(msg).appendTo(gui.progressMessage.empty().show());
  };

  gui.clearProgressMessage = function () {
    if (gui.progressMessage) gui.progressMessage.hide();
  };

  gui.consoleIsOpen = function () {
    return gui.container.hasClass("console-open");
  };

  // Make this instance interactive and editable
  gui.focus = function () {
    var curr = GUI.__active;
    if (curr == gui) return;
    if (curr) {
      curr.blur();
    }
    GUI.__active = gui;
    MessageProxy(gui);
    ImportFileProxy(gui);
    WriteFilesProxy(gui);
    gui.dispatchEvent("active");
  };

  gui.blur = function () {
    if (GUI.isActiveInstance(gui)) {
      GUI.__active = null;
      gui.dispatchEvent("inactive");
    }
  };

  // switch between multiple gui instances on mouse click
  gui.container.node().addEventListener(
    "mouseup",
    function (e) {
      if (GUI.isActiveInstance(gui)) return;
      e.stopPropagation();
      gui.focus();
    },
    true
  ); // use capture

  if (opts.focus) {
    gui.focus();
  }

  return gui;
}
