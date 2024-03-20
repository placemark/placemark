import { expect, describe, it } from "vitest";

import { USelection } from "state/uselection";
import { Sel, SELECTION_NONE } from "state/jotai";
import { CVertexId } from "app/lib/id";
import { fcLineString, wrapMapAndId } from "test/helpers";
import { FolderMap, IFolder } from "types";

const multi: Sel = {
  type: "multi",
  ids: ["xxx", "yyy"],
};

const folderSelection: Sel = {
  type: "folder",
  id: "xxx",
};

const folderMap: FolderMap = new Map();

describe("USelection", () => {
  it("#getVertexIds", () => {
    expect(USelection.getVertexIds(USelection.none())).toEqual([]);
    expect(
      USelection.getVertexIds({
        type: "single",
        id: "xxx",
        parts: [
          {
            type: "vertex",
            featureId: 0,
            vertex: 10,
          },
        ],
      })
    ).toEqual([
      {
        type: "vertex",
        featureId: 0,
        vertex: 10,
      },
    ]);
  });
  it("#none", () => {
    expect(USelection.none()).toEqual(SELECTION_NONE);
  });
  it("#reduce", () => {
    expect(USelection.reduce(USelection.none())).toEqual(SELECTION_NONE);
    expect(USelection.reduce(USelection.single("xxx"))).toEqual(SELECTION_NONE);
    expect(
      USelection.reduce({
        type: "single",
        id: "xxx",
        parts: [
          {
            type: "vertex",
            featureId: 0,
            vertex: 0,
          },
        ],
      })
    ).toEqual(USelection.single("xxx"));
  });
  it("#single", () => {
    expect(USelection.single("xxx")).toEqual({
      type: "single",
      id: "xxx",
      parts: [],
    });
  });
  it("#single", () => {
    expect(
      USelection.isVertexSelected(
        {
          type: "single",
          id: "xxx",
          parts: [
            {
              type: "vertex",
              featureId: 0,
              vertex: 10,
            },
          ],
        },
        "xxx",
        {
          type: "vertex",
          featureId: 0,
          vertex: 10,
        }
      )
    ).toBeTruthy();
  });
  it("#fromIds", () => {
    expect(USelection.fromIds([])).toEqual(USelection.none());
    expect(USelection.fromIds(["xxx"])).toEqual(USelection.single("xxx"));
    expect(USelection.fromIds(["xxx", "yyy"])).toEqual(multi);
  });
  it("#asSingle", () => {
    expect(() => USelection.asSingle(USelection.none())).toThrowError();
    expect(USelection.asSingle(multi)).toEqual(USelection.single("xxx"));
  });
  it("#none", () => {
    expect(USelection.none()).toEqual(SELECTION_NONE);
  });
  it("#toIds", () => {
    expect(USelection.toIds(USelection.none())).toEqual([]);
    expect(USelection.toIds(USelection.single("xxx"))).toEqual(["xxx"]);
    expect(USelection.toIds(multi)).toEqual(["xxx", "yyy"]);
  });
  it("#isSelected", () => {
    expect(USelection.isSelected(USelection.none(), "xxx")).toBeFalsy();
    expect(USelection.isSelected(USelection.single("xxx"), "xxx")).toBeTruthy();
    expect(USelection.isSelected(multi, "xxx")).toBeTruthy();
  });
  it("#isVertexSelected", () => {
    expect(
      USelection.isVertexSelected(
        USelection.single("xxx"),
        "xxx",
        new CVertexId(0, 0)
      )
    ).toBeFalsy();
  });
  it("#folder", () => {
    expect(USelection.folder("xxx")).toMatchInlineSnapshot(`
      {
        "id": "xxx",
        "type": "folder",
      }
    `);
  });
  it("#toggleSelectionId", () => {
    expect(USelection.toggleSelectionId(USelection.none(), "xxx")).toEqual(
      USelection.single("xxx")
    );
    expect(
      USelection.toggleSelectionId(USelection.single("xxx"), "xxx")
    ).toEqual(USelection.none());
  });
  it("#toggleSingleSelectionId", () => {
    expect(
      USelection.toggleSingleSelectionId(USelection.none(), "xxx")
    ).toEqual(USelection.single("xxx"));
    expect(
      USelection.toggleSelectionId(USelection.single("xxx"), "xxx")
    ).toEqual(USelection.none());
  });

  it("#isFolderSelected", () => {
    expect(USelection.isFolderSelected(USelection.none(), "xxx")).toBeFalsy();
    expect(
      USelection.isFolderSelected(USelection.single("xxx"), "xxx")
    ).toBeFalsy();
    expect(
      USelection.isFolderSelected(USelection.folder("xxx"), "xxx")
    ).toBeTruthy();
  });

  it("#getSelectedFeatures", () => {
    const { featureMap } = wrapMapAndId(fcLineString);
    expect(
      USelection.getSelectedFeatures({
        selection: USelection.none(),
        featureMap,
        folderMap,
      })
    ).toEqual([]);
    expect(
      USelection.getSelectedFeatures({
        selection: USelection.fromIds(
          [...featureMap.values()].map((f) => f.id)
        ),
        featureMap,
        folderMap,
      })
    ).toHaveLength(1);

    expect(
      USelection.getSelectedFeatures({
        selection: USelection.folder("invalid"),
        featureMap,
        folderMap,
      })
    ).toHaveLength(0);

    const { featureMap: featureMap2 } = wrapMapAndId(fcLineString);

    const folder: IFolder = {
      id: "000",
      at: "a0",
      name: "X",
      expanded: false,
      locked: false,
      folderId: null,
      visibility: true,
    };

    const featureMap3 = new Map(
      Array.from(featureMap2.entries(), ([key, feature]) => {
        return [
          key,
          {
            ...feature,
            folderId: folder.id,
          },
        ];
      })
    );

    const folderMap2: FolderMap = new Map([["000", folder]]);

    expect(
      USelection.getSelectedFeatures({
        selection: USelection.folder("000"),
        featureMap: featureMap3,
        folderMap: folderMap2,
      })
    ).toHaveLength(1);

    expect(
      USelection.getSelectedFeatures({
        selection: USelection.folder("000"),
        featureMap: featureMap3,
        folderMap: folderMap2,
      })
    ).toHaveLength(1);
  });

  it("#addSelectionId", () => {
    expect(USelection.addSelectionId(USelection.none(), "xxx")).toEqual(
      USelection.single("xxx")
    );
    expect(USelection.addSelectionId(USelection.single("xxx"), "xxx")).toEqual(
      USelection.single("xxx")
    );
  });

  it("#folderId", () => {
    expect(USelection.folderId(SELECTION_NONE)).toBeNull();
    expect(USelection.folderId(folderSelection)).toEqual("xxx");
  });

  describe("#selectionToFolder", () => {
    it("none", () => {
      expect(
        USelection.selectionToFolder({
          featureMap: new Map(),
          folderMap,
          selection: SELECTION_NONE,
        })
      ).toEqual(SELECTION_NONE);
    });
    it("folder selection", () => {
      expect(
        USelection.selectionToFolder({
          featureMap: new Map(),
          folderMap,
          selection: folderSelection,
        })
      ).toEqual(folderSelection);
    });

    it("feature without folder", () => {
      const { featureMap } = wrapMapAndId(fcLineString);
      expect(
        USelection.selectionToFolder({
          featureMap,
          folderMap,
          selection: USelection.single([...featureMap.values()][0].id),
        })
      ).toEqual(SELECTION_NONE);
    });

    it("feature with folder", () => {
      const { featureMap } = wrapMapAndId(fcLineString);
      const id = [...featureMap.keys()][0];
      featureMap.set(id, {
        ...featureMap.get(id)!,
        folderId: "xxx",
      });
      expect(
        USelection.selectionToFolder({
          featureMap,
          folderMap,
          selection: USelection.single([...featureMap.values()][0].id),
        })
      ).toEqual({
        type: "folder",
        id: "xxx",
      });
    });
  });
});
