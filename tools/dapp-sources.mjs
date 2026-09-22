// Worked edits shared by native and static-host browser regressions, not the UI.
export function explorerSources(source) {
  source=source.replace('createApp(nodeUrl, contractId)', 'createApp(nodeUrl, contractId, driverPath = "/api/registry-driver")')
    .replace('new URL("/api/registry-driver", nodeUrl)', 'new URL(driverPath, nodeUrl)');
  source+=`\n// Keep my counter code above.\nexport async function readRegistration(dusk, id) {
    const args = Number(id);
    if (!Number.isSafeInteger(args) || args < 0)
        throw new Error("Invalid record ID");
    const seats = await dusk.readContract({contract:"registry",functionName:"get_registration",args});
    return { id, seats };
}\n`;
  const stages={'explorer-read':source};
  source=source.replace('    return { id, seats };','    if (seats === null) return null;\n    return { id, seats };');stages['explorer-missing']=source;
  source=source.replace('    return { id, seats };','    const owner = await dusk.readContract({contract:"registry",functionName:"owner_of",args});\n    return { id, seats, owner };');stages['explorer-owner']=source;
  source=source.replace('    return { id, seats, owner };','    const confirmed = await dusk.readContract({contract:"registry",functionName:"is_confirmed",args});\n    return { id, seats, owner, confirmed };');stages['explorer-confirmed']=source;
  source=source.replace('    const args = Number(id);\n    if (!Number.isSafeInteger(args) || args < 0)\n        throw new Error("Invalid record ID");',
    '    if (typeof id !== "string" || !/^(0|[1-9][0-9]{0,19})$/.test(id) || BigInt(id) > 18446744073709551615n)\n        throw new Error("Invalid record ID");\n    const args = JSON.rawJSON(id);');stages['explorer-precision']=source;
  source+=`\nexport async function loadRegistration(dusk, id) {
    try {
        const record = await readRegistration(dusk, id);
        return record === null ? { status: "missing" } : { status: "found", record };
    } catch {
        return { status: "unavailable" };
    }
}\n`;
  stages['explorer-recovery']=source;return stages;
}
