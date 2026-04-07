export default run;

async function run(context) {
  console.log("## before pack");
  console.log("Stripping .node files that don't belong to this platform...");
  removeExtraNodeFiles(context);
}

/**
 * Removes .node files for platforms other than the current target platform.
 *
 * Architecture-specific filtering is intentionally NOT done here. During macOS
 * universal builds, @electron/universal requires all non-asar files to be
 * present in both the x64 and arm64 per-arch builds. The `singleArchFiles`
 * and `x64ArchFiles` options in electron-builder.json handle arch-specific
 * .node files during the universal merge phase instead.
 */
function removeExtraNodeFiles(context) {
  const packagerPlatform = context.packager.platform.nodeName;
  const platforms = ["darwin", "linux", "win32"];
  const fileFilter = context.packager.info._configuration.files[0].filter;

  for (const platform of platforms) {
    if (platform !== packagerPlatform) {
      fileFilter.push(`!node_modules/dc-native/dc_native.${platform}-*.node`);
    }
  }
}
