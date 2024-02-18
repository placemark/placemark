import { expect, vi, test } from "vitest";

import React from "react";
import { render, screen, fireEvent } from "test/utils";
import { Formik } from "formik";
import SimpleDialogActions from "./simple_dialog_actions";

test.skip("loads and displays simple dialog actions", async () => {
  const onClose = vi.fn();
  render(
    <Formik initialValues={{}} onSubmit={() => {}}>
      <SimpleDialogActions action="Yeah" onClose={onClose} />
    </Formik>
  );
  await screen.findByText("Yeah");
  fireEvent.click(await screen.findByText("Cancel"));
  expect(onClose).toBeCalledTimes(1);
});
