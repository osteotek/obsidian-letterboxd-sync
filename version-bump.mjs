import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

if (!targetVersion) {
	console.error("Error: npm_package_version not found");
	process.exit(1);
}

console.log(`Bumping version to ${targetVersion}`);

// Read and update manifest.json
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");
console.log(`✓ Updated manifest.json to version ${targetVersion}`);

// Update versions.json with target version and minAppVersion from manifest.json
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
if (!versions[targetVersion]) {
	versions[targetVersion] = minAppVersion;
	writeFileSync('versions.json', JSON.stringify(versions, null, '\t') + "\n");
	console.log(`✓ Added version ${targetVersion} to versions.json with minAppVersion ${minAppVersion}`);
} else {
	console.log(`✓ Version ${targetVersion} already exists in versions.json`);
}

