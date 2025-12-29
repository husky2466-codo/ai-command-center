Build AI Command Center for release.

Steps:
1. Run `npm run build` to build the React app to `dist/`
2. Run `npm run build:electron` to package with electron-builder
3. Output will be in `release/` folder

Pre-build checklist:
- Verify version in package.json
- Check that all API endpoints are in CSP (index.html)
- Ensure icon.ico exists in src/assets/
- Test with `npm run dev:electron` first
