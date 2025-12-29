Create a new app/tool in AI Command Center with the name: $ARGUMENTS

Steps:
1. Create `src/components/<name>/<Name>.jsx` with a functional React component that receives `{ apiKeys }` prop
2. Create `src/components/<name>/<Name>.css` with scoped styles using the existing CSS variable system
3. Add the app to the `APPS` object in `src/App.jsx` with a unique accent color
4. Add the app card to the `apps` array in `src/components/shared/HomeScreen.jsx`

Use the existing apps (MemoryViewer, VisionApp, ChainRunner) as reference for component structure and styling patterns.
