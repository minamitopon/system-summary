import assert from "node:assert/strict";

import { parseUnifiedDiff } from "./generate-preview-changes.mjs";

const diff = `diff --git a/Oklahoma/1C/index.bml b/Oklahoma/1C/index.bml
index 1111111..2222222 100644
--- a/Oklahoma/1C/index.bml
+++ b/Oklahoma/1C/index.bml
@@ -10 +10,2 @@
-1D old
+1D new
+  1H continuation
@@ -20 +21,0 @@
-deleted agreement
diff --git a/README.md b/README.md
index 3333333..4444444 100644
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
-old
+new
diff --git a/Oklahoma/other/index.bml b/Oklahoma/other/index.bml
new file mode 100644
index 0000000..5555555
--- /dev/null
+++ b/Oklahoma/other/index.bml
@@ -0,0 +1,3 @@
+2way Game Try
+  2S
+    accept
`;

assert.deepEqual(parseUnifiedDiff(diff), {
  "Oklahoma/1C/index.bml": [10, 11, 21],
  "Oklahoma/other/index.bml": [1, 2, 3],
});

console.log("preview-change tests passed");
