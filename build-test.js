/* eslint-disable no-console */
/**
 * Test build.
 *
 * Produces a .pbiviz with the Pro tier forced on and a "_test" GUID suffix, so it can be
 * installed alongside the AppSource build without conflicting with it.
 *
 * The source tree always stays in PRODUCTION state: this script patches, packages and then
 * restores, including on failure. Never commit a patched source.
 *
 *   node build-test.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const VISUAL_TS = path.join(ROOT, "src", "visual.ts");
const PBIVIZ_JSON = path.join(ROOT, "pbiviz.json");

/** Exact text the patcher expects to find, and what it becomes. */
const PATCHES = [
    {
        file: VISUAL_TS,
        find: "private isPro = false;",
        replace: "private isPro = true; // PATCHED BY build-test.js",
        why: "force the Pro tier on"
    }
];

function fail(message) {
    console.error("\n  ✗ " + message + "\n");
    process.exit(1);
}

function readOriginals() {
    return {
        visualTs: fs.readFileSync(VISUAL_TS, "utf8"),
        pbivizJson: fs.readFileSync(PBIVIZ_JSON, "utf8")
    };
}

function restore(originals) {
    fs.writeFileSync(VISUAL_TS, originals.visualTs, "utf8");
    fs.writeFileSync(PBIVIZ_JSON, originals.pbivizJson, "utf8");
    console.log("  ↺ source restored to production state");
}

function main() {
    console.log("\n  Dynamic Matrix Heatmap — TEST build\n");

    const originals = readOriginals();

    // ---- Verify every patch target is present before touching anything ---------------------
    for (const p of PATCHES) {
        const content = fs.readFileSync(p.file, "utf8");
        if (content.indexOf(p.find) === -1) {
            fail(
                "Patch target not found in " + path.relative(ROOT, p.file) + ":\n\n" +
                "      " + p.find + "\n\n" +
                "    The source changed and this script no longer matches it.\n" +
                "    Update the PATCHES array in build-test.js — do not change the source to fit the script."
            );
        }
    }

    const pbiviz = JSON.parse(originals.pbivizJson);
    const realGuid = pbiviz.visual.guid;

    if (realGuid.endsWith("_test")) {
        fail("pbiviz.json already carries a _test GUID. Restore it before building.");
    }

    try {
        // ---- Patch ------------------------------------------------------------------------
        for (const p of PATCHES) {
            const content = fs.readFileSync(p.file, "utf8");
            fs.writeFileSync(p.file, content.replace(p.find, p.replace), "utf8");
            console.log("  • " + p.why);
        }

        pbiviz.visual.guid = realGuid + "_test";
        pbiviz.visual.displayName = pbiviz.visual.displayName + " (TEST)";
        fs.writeFileSync(PBIVIZ_JSON, JSON.stringify(pbiviz, null, 4) + "\n", "utf8");
        console.log("  • GUID suffixed with _test");

        // ---- Package ----------------------------------------------------------------------
        console.log("\n  Packaging...\n");
        execSync("npx pbiviz package", { cwd: ROOT, stdio: "inherit" });

        console.log("\n  ✓ Test build created in dist/");
        console.log("    Pro tier is FORCED ON. This build must never be submitted to AppSource.\n");
    } catch (err) {
        console.error("\n  ✗ Packaging failed: " + (err && err.message ? err.message : err));
        restore(originals);
        process.exit(1);
    }

    restore(originals);
}

main();
