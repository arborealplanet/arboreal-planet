import fs from "node:fs";

const file = "src/components/ChondroBreederGameV3.tsx";
let source = fs.readFileSync(file, "utf8");

if (source.includes("arboreal-chondro-clutch-action")) {
  console.log("Chondro clutch action bridge already applied.");
  process.exit(0);
}

const marker = '  async function finishClutch() {\n    if (!clutch || !clutchEstablished || marketBusy) return;';
if (!source.includes(marker)) {
  throw new Error("Could not find focused clutch finish handler for action bridge.");
}

const bridge = `  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    function handleClutchAction(event) {
      const detail = event.detail ?? {};
      if (detail.action === "establish") {
        payClutchEstablishment();
        return;
      }
      if (detail.action === "toggle-holdback" && typeof detail.snakeId === "string") {
        toggleHoldback(detail.snakeId);
        return;
      }
      if (detail.action === "finish") {
        void finishClutch();
      }
    }
    window.addEventListener("arboreal-chondro-clutch-action", handleClutchAction);
    return () => window.removeEventListener("arboreal-chondro-clutch-action", handleClutchAction);
  }, [clutch, clutchEstablished, cash, clutchEstablishmentCost, holdbacks, marketBusy, season]);
  /* eslint-enable react-hooks/exhaustive-deps */

`;

source = source.replace(marker, bridge + marker);
fs.writeFileSync(file, source);
console.log("Connected visual clutch controls to the canonical Chondro game state.");
