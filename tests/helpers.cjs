const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Each DOM gets an isolated module graph, just as a fresh browser page does.
function createModuleLoader(dom) {
  const context = dom.getInternalVMContext();
  const modules = new Map();

  function getModule(filename) {
    if (!modules.has(filename)) {
      modules.set(
        filename,
        new vm.SourceTextModule(fs.readFileSync(filename, "utf8"), {
          context,
          identifier: filename,
        }),
      );
    }
    return modules.get(filename);
  }

  async function loadModule(filename) {
    const entry = getModule(path.resolve(filename));
    if (entry.status === "unlinked") {
      await entry.link((specifier, parent) =>
        getModule(path.resolve(path.dirname(parent.identifier), specifier)),
      );
    }
    if (entry.status === "linked") await entry.evaluate();
    return entry;
  }

  return { modules, loadModule };
}

function nextTurn() {
  return new Promise((resolve) => setImmediate(resolve));
}

module.exports = { createModuleLoader, nextTurn };
