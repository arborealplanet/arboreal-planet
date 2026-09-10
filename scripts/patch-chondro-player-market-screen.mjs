import fs from "node:fs";

const gameFile = "src/components/ChondroBreederGameV3.tsx";
let game = fs.readFileSync(gameFile, "utf8");

// The focused Store owns the visible player market; GameV3 remains the canonical state owner.
game = game.replace(
  'if (activeScreen === "market" && value.includes("daily snake store")) return true;',
  'if (activeScreen === "market" && (value.includes("daily snake store") || value.includes("player snake market"))) return true;',
);

if (!game.includes('arboreal-chondro-market-action')) {
  const marker = '  function transferPositive(a: Snake) {';
  if (!game.includes(marker)) throw new Error("Could not locate market action bridge insertion point.");
  const bridge = `  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    function handleMarketAction(event: Event) {
      const custom = event as CustomEvent<{ action?: string; listing?: PlayerMarketListing }>;
      const detail = custom.detail ?? {};
      if (detail.action === "buy-player-snake" && detail.listing) {
        void buyPlayerSnake(detail.listing);
      }
    }
    window.addEventListener("arboreal-chondro-market-action", handleMarketAction);
    return () => window.removeEventListener("arboreal-chondro-market-action", handleMarketAction);
  }, [cash, openSlots, marketBusy]);
  /* eslint-enable react-hooks/exhaustive-deps */

`;
  game = game.replace(marker, bridge + marker);
}

fs.writeFileSync(gameFile, game);

const workspaceFile = "src/components/ChondroBreederWorkspace.tsx";
let workspace = fs.readFileSync(workspaceFile, "utf8");

if (!workspace.includes('import { ChondroPlayerMarket } from "@/components/ChondroPlayerMarket";')) {
  const importMarker = 'import { ChondroFavoritesMarketPanel } from "@/components/ChondroFavoritesMarketPanel";\n';
  if (!workspace.includes(importMarker)) throw new Error("Could not locate player-market import insertion point.");
  workspace = workspace.replace(
    importMarker,
    importMarker + 'import { ChondroPlayerMarket } from "@/components/ChondroPlayerMarket";\n',
  );
}

if (!workspace.includes('{view === "market" ? <ChondroPlayerMarket /> : null}')) {
  const shopMarker = '      {view === "market" ? <ChondroBreederExpandedShop /> : null}\n';
  if (!workspace.includes(shopMarker)) throw new Error("Could not locate dedicated store insertion point.");
  workspace = workspace.replace(
    shopMarker,
    shopMarker + '      {view === "market" ? <ChondroPlayerMarket /> : null}\n',
  );
}

fs.writeFileSync(workspaceFile, workspace);
console.log("Moved visible player-market browsing into the dedicated Chondro Store screen.");
