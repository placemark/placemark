import { expect, test } from "vitest";

import { FolderMap } from "types";
import {
  collectFoldersByFolder,
  filterLockedFeatures,
  generateExclude,
  generateLockedSet,
  isFeatureLocked,
} from "./folder";
import { wrap, fcLineString } from "test/helpers";

const id = "00000000-0000-0000-0000-000000000000";
const id1 = "00000000-0000-0000-0000-000000000001";

const nestedFolderMap: FolderMap = new Map([
  [
    id,
    {
      id: id,
      folderId: null,
      visibility: false,
      name: "Foo",
      at: "a0",
      expanded: true,
      locked: true,
    },
  ],
  [
    id1,
    {
      id: id1,
      folderId: id,
      visibility: true,
      name: "Foo",
      at: "a0",
      expanded: true,
      locked: false,
    },
  ],
]);

const oneHidden: FolderMap = new Map([
  [
    id,
    {
      id: id,
      folderId: null,
      visibility: false,
      name: "Foo",
      at: "a0",
      expanded: true,
      locked: true,
    },
  ],
  [
    id1,
    {
      id: id1,
      folderId: null,
      visibility: true,
      name: "Foo",
      at: "a0",
      expanded: true,
      locked: false,
    },
  ],
]);

const folders: FolderMap = new Map([
  [
    id,
    {
      id: id,
      folderId: null,
      visibility: true,
      name: "Foo",
      at: "a0",
      expanded: true,
      locked: true,
    },
  ],
  [
    id1,
    {
      id: id1,
      folderId: null,
      visibility: true,
      name: "Foo",
      at: "a0",
      expanded: true,
      locked: false,
    },
  ],
]);

test("generateLockedSet", () => {
  expect(generateLockedSet(folders)).toMatchInlineSnapshot(`
    Set {
      "00000000-0000-0000-0000-000000000000",
    }
  `);
});

test("collectFoldersByFolder", () => {
  expect(collectFoldersByFolder(folders)).toMatchInlineSnapshot(`
    Map {
      null => [
        {
          "at": "a0",
          "expanded": true,
          "folderId": null,
          "id": "00000000-0000-0000-0000-000000000000",
          "locked": true,
          "name": "Foo",
          "visibility": true,
        },
        {
          "at": "a0",
          "expanded": true,
          "folderId": null,
          "id": "00000000-0000-0000-0000-000000000001",
          "locked": false,
          "name": "Foo",
          "visibility": true,
        },
      ],
    }
  `);
});

test("isFeatureLocked", () => {
  expect(isFeatureLocked(wrap(fcLineString)[0], new Map())).toBeFalsy();
  expect(
    isFeatureLocked(
      {
        ...wrap(fcLineString)[0],
        folderId: id,
      },
      nestedFolderMap
    )
  ).toBeTruthy();
  expect(
    isFeatureLocked(
      {
        ...wrap(fcLineString)[0],
        folderId: id1,
      },
      nestedFolderMap
    )
  ).toBeTruthy();
});

test("filterLockedFeatures", () => {
  expect(
    filterLockedFeatures({ featureMap: new Map(), folderMap: folders })
  ).toMatchInlineSnapshot('[]');

  const wrappedLineString = wrap(fcLineString)[0];
  const featureMap = new Map([[wrappedLineString.id, wrappedLineString]]);

  expect(filterLockedFeatures({ featureMap, folderMap: folders })).toHaveLength(
    1
  );

  const featureMap2 = new Map([
    [
      wrappedLineString.id,
      {
        ...wrappedLineString,
        folderId: id,
      },
    ],
  ]);

  expect(
    filterLockedFeatures({ featureMap: featureMap2, folderMap: folders })
  ).toHaveLength(0);
});

test("generateExclude", () => {
  expect(generateExclude(new Map())).toMatchInlineSnapshot(`Set {}`);
  expect(generateExclude(folders)).toMatchInlineSnapshot(`Set {}`);
  expect(generateExclude(oneHidden)).toMatchInlineSnapshot(`
    Set {
      "00000000-0000-0000-0000-000000000000",
    }
  `);
  expect(generateExclude(nestedFolderMap)).toMatchInlineSnapshot(`
    Set {
      "00000000-0000-0000-0000-000000000000",
      "00000000-0000-0000-0000-000000000001",
    }
  `);
});
