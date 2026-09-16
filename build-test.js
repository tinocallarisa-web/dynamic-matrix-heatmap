/* eslint-disable no-console */
/**
 * Test build.
 *
 * Produces a .pbiviz for Power BI Desktop with its own GUID suffix, so it can be installed
 * alongside the AppSource build without conflicting with it.
 *
 * The source tree always stays in PRODUCTION state: this script patches, packages and then
 * restores, including on failure. Never commit a patched source.
 *
 *   node build-test.js            Pro tier forced on,          GUID + "_test"
 *   node build-test.js --free     real licence check (Free),   GUID + "_testfree"
 *   node build-test.js --debug    adds a red DBG line with viewMode / licence state (test only)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const VISUAL_TS = path.join(ROOT, "src", "visual.ts");
const PBIVIZ_JSON = path.join(ROOT, "pbiviz.json");
const forceFree = process.argv.includes("--free");
const debug = process.argv.includes("--debug");

const DEBUG_ANCHOR = "this.updateWatermark();";
const DEBUG_CODE = DEBUG_ANCHOR + `
            { const o: any = this.lastOptions || {}; let d = this.target.querySelector(".dmh-dbg") as HTMLElement;
              if (!d) { d = document.createElement("div"); d.className = "dmh-dbg";
                d.style.cssText = "position:absolute;left:2px;bottom:2px;z-index:9;font:10px sans-serif;color:#C00000;pointer-events:none";
                this.target.appendChild(d); }
              d.textContent = "DBG viewMode=" + o.viewMode + " lic=" + this.licenseResolved + " unsup=" + this.licenseEnvUnsupported +
                " pro=" + this.isPro + " preview=" + this.isPreview() + " attempted=" + this.attemptedPro.join(","); }`;

/** Exact text the patcher expects to find, and what it becomes. */
const PATCHES = [];
if (!forceFree) {
    PATCHES.push({
        find: "private isPro = false;",
        replace: "private isPro = true; // PATCHED BY build-test.js",
        why: "force the Pro tier on"
    });
}
if (debug) {
    PATCHES.push({ find: DEBUG_ANCHOR, replace: DEBUG_CODE, why: "add DBG line" });
}

function fail(message) {
    console.error("\n  ✗ " + message + "\n");
    process.exit(1);
}

function main() {
    console.log("\n  Dynamic Matrix Heatmap — TEST build (" + (forceFree ? "Free, real licence" : "Pro forced") + (debug ? ", DBG" : "") + ")\n");

    const originals = {
        visualTs: fs.readFileSync(VISUAL_TS, "utf8"),
        pbivizJson: fs.readFileSync(PBIVIZ_JSON, "utf8")
    };
    const restore = () => {
        fs.writeFileSync(VISUAL_TS, originals.visualTs, "utf8");
        fs.writeFileSync(PBIVIZ_JSON, originals.pbivizJson, "utf8");
        console.log("  ↺ source restored to production state");
    };

    // ---- Verify every patch target is present before touching anything ---------------------
    for (const p of PATCHES) {
        if (originals.visualTs.indexOf(p.find) === -1) {
            fail(
                "Patch target not found in src/visual.ts:\n\n      " + p.find + "\n\n" +
                "    Update the PATCHES in build-test.js — do not change the source to fit the script."
            );
        }
    }

    const pbiviz = JSON.parse(originals.pbivizJson);
    const realGuid = pbiviz.visual.guid;
    if (/_test/.test(realGuid)) {
        fail("pbiviz.json already carries a _test GUID. Restore it before building.");
    }

    let ok = false;
    try {
        let ts = originals.visualTs;
        for (const p of PATCHES) {
            ts = ts.replace(p.find, p.replace);
            console.log("  • " + p.why);
        }
        fs.writeFileSync(VISUAL_TS, ts, "utf8");

        pbiviz.visual.guid = realGuid + (forceFree ? "_testfree" : "_test");
        pbiviz.visual.displayName = pbiviz.visual.displayName + (forceFree ? " (TEST FREE)" : " (TEST)");
        fs.writeFileSync(PBIVIZ_JSON, JSON.stringify(pbiviz, null, 4) + "\n", "utf8");
        console.log("  • GUID " + pbiviz.visual.guid);

        console.log("\n  Packaging...\n");
        execSync("npx pbiviz package", { cwd: ROOT, stdio: "inherit" });
        ok = true;
        console.log("\n  ✓ Test build created: dist/" + pbiviz.visual.guid + "." + pbiviz.visual.version + ".pbiviz");
        console.log("    This build must never be submitted to AppSource.\n");
    } catch (err) {
        console.error("\n  ✗ Packaging failed: " + (err && err.message ? err.message : err));
    } finally {
        restore();
    }
    if (!ok) { process.exit(1); }
}

main();
