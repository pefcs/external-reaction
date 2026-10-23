import fs from "node:fs";
import path from "node:path";

const manifestPath = path.resolve("module.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function fail(message) {
  console.error(`Module validation failed: ${message}`);
  process.exit(1);
}

if (manifest.id !== "external-reaction") {
  fail(`expected id "external-reaction", received ${JSON.stringify(manifest.id)}`);
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version ?? "")) {
  fail(`version must use semantic-version format MAJOR.MINOR.PATCH; received ${JSON.stringify(manifest.version)}`);
}

if (!Array.isArray(manifest.esmodules) || manifest.esmodules.length === 0) {
  fail("esmodules must contain the module entry point");
}

for (const entry of manifest.esmodules) {
  if (!fs.existsSync(path.resolve(entry))) fail(`entry point does not exist: ${entry}`);
}

const repositoryUrl = manifest.url;
const manifestUrl = manifest.manifest;
const downloadUrl = manifest.download;

if (![repositoryUrl, manifestUrl, downloadUrl].every(value => typeof value === "string" && value.length > 0)) {
  fail('url, manifest, and download must be configured before publishing');
}

if ([repositoryUrl, manifestUrl, downloadUrl].some(value => value.includes("YOUR_GITHUB_USERNAME"))) {
  fail("replace YOUR_GITHUB_USERNAME in module.json with the real GitHub account name before the first push");
}

const readme = fs.readFileSync(path.resolve("README.md"), "utf8");
if (readme.includes("YOUR_GITHUB_USERNAME")) {
  fail("replace YOUR_GITHUB_USERNAME in README.md with the real GitHub account name before the first push");
}

let parsedRepositoryUrl;
try {
  parsedRepositoryUrl = new URL(repositoryUrl);
} catch {
  fail(`repository url is not a valid URL: ${repositoryUrl}`);
}

if (parsedRepositoryUrl.protocol !== "https:" || parsedRepositoryUrl.hostname !== "github.com") {
  fail("url must be the HTTPS URL for the project's GitHub repository");
}

const parts = parsedRepositoryUrl.pathname.split("/").filter(Boolean);
if (parts.length !== 2) fail("url must look like https://github.com/OWNER/REPOSITORY");

const [owner, repository] = parts;
const expectedManifest = `https://github.com/${owner}/${repository}/releases/latest/download/module.json`;
const expectedDownload = `https://github.com/${owner}/${repository}/releases/latest/download/module.zip`;

if (manifestUrl !== expectedManifest) {
  fail(`manifest must point to the latest release module.json asset: ${expectedManifest}`);
}
if (downloadUrl !== expectedDownload) {
  fail(`download must point to the latest release asset: ${expectedDownload}`);
}

if (!manifest.compatibility?.minimum) fail("compatibility.minimum is missing");
if (!manifest.relationships?.systems?.some(system => system.id === "dnd5e")) {
  fail("relationships.systems must declare dnd5e");
}

console.log(`Validated ${manifest.title ?? manifest.id} v${manifest.version}.`);
console.log(`Manifest URL: ${manifest.manifest}`);
console.log(`Download URL: ${manifest.download}`);
