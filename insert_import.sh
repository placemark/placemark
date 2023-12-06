#!/usr/bin/env zsh

for f in `fd .test.ts`; do
  echo $f
  (echo "import { beforeEach, beforeAll, expect, describe, it, vi, test } from \"vitest\";\n"; cat $f) > tmp
  mv tmp $f
done

./node_modules/.bin/eslint --fix
