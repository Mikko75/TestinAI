# Realitin AR — Project brief and implementation plan

This document is the project specification for Claude Code in VS Code.
Repository: https://github.com/Mikko75/TestinAI
Current active phase: PHASE 1 — Working WebAR.

## 1. Background and product goal

Realitin previously allowed a user to view a furniture image in augmented reality on a mobile device. Background removal produced a transparent PNG, which was displayed as a flat image in AR.

The new goal is a browser-based experience that eventually turns a furniture image into a 3D model and lets the user place that model in their room.

The eventual journey is:

1. Upload a furniture image.
2. Remove the background automatically.
3. Generate a 3D model using an image-to-3D service.
4. Preview and inspect the generated model.
5. Open AR on a compatible mobile device.
6. Place the furniture in the room.

The user should not need to understand Blender, modelling or file formats.

The previous background-removal implementation may exist elsewhere. Inspect available code before proposing reuse. Do not assume it exists in this repository.

## 2. Current milestone

Build PHASE 1 only.

Prove that an existing 3D furniture model can load in a web browser and open in an AR experience on compatible phones.

Do not implement image uploads, background removal, AI generation, Blender integration, accounts, a database, a marketplace or a dashboard in this phase.

A working 3D preview alone does not prove that AR works. Physical-device AR testing is a separate acceptance requirement.

## 3. Technology direction

- React, TypeScript and Vite for a new application if the repository does not already contain a suitable application.
- Tailwind CSS for styling.
- Google's model-viewer component, installed as @google/model-viewer.
- GLB as the main model asset format.
- iOS Quick Look with automatic USDZ generation or an explicit tested USDZ asset if needed.
- No backend is required for PHASE 1.

Use compatible current stable package versions, check their official installation instructions and commit the package lockfile. Do not copy old dependency configuration blindly.

Use existing suitable UI components. Add shadcn/ui only if a component is actually needed. Do not introduce a large component library for this small page.

Keep the viewer separate from page layout and model metadata so generated models can be supplied later. Avoid building unused provider interfaces or backend abstractions now.

Technical reference links:

- https://modelviewer.dev/
- https://modelviewer.dev/docs/
- https://modelviewer.dev/examples/augmentedreality/

Check the official documentation when implementing. Device support must be verified against the installed version and the actual test devices.

## 4. Working rules for Claude

1. Inspect repository files, package scripts and existing instructions before editing.
2. Treat this document as the agreed product scope. Identify conflicts with existing project instructions before resolving them.
3. Briefly explain the implementation plan, then implement PHASE 1. No additional approval is required for routine work inside this phase.
4. Reuse working code and suitable components.
5. Do not change unrelated files or remove existing work.
6. Keep code modular but avoid unnecessary layers.
7. Keep all user-facing labels in Finnish.
8. Do not invent features, roles, statuses or workflows.
9. When a requirement is unclear, state the assumption. Ask only if the answer blocks implementation or materially changes the product.
10. Run appropriate build and type checks. Record actual results.
11. Distinguish implementation, browser verification and physical-device verification.
12. Stop after PHASE 1 and report the result. Ask before starting PHASE 2.
13. Do not automatically push to GitHub or publish a deployment. Provide the owner with the commands or steps when needed.

## 5. PHASE 1 — Working WebAR

### TASK 1.1 — Inspect and initialize

- Inspect the project and identify any existing application.
- If the repository contains only a README, create a React + TypeScript + Vite application in the repository root.
- Configure Tailwind using the installation instructions appropriate to the chosen version.
- Install model-viewer.
- Verify that the application starts and builds.
- Keep dependencies limited to this phase.

Deliverable: a runnable application with documented commands.

### TASK 1.2 — Add one real furniture model

- Choose one legally reusable chair or other furniture GLB.
- Record the source URL, creator, licence and required attribution in the project.
- Prefer a self-contained asset served from the project's public assets.
- Check geometry, materials, orientation and dimensions.
- Record actual known dimensions. If the dimensions are unknown, explicitly say they are unverified.
- Do not claim accurate real-world scale just because the model looks correct on screen.
- Ensure the asset URL can be reached by external platform viewers in the HTTPS test environment.

Deliverable: one documented sample model.

### TASK 1.3 — Implement the browser viewer

- Display the GLB in a large model-viewer area.
- Support rotation and zoom through touch and mouse.
- Preserve the object's proportions.
- Provide meaningful alternative text.
- Show a loading state and a usable model-load error state.
- Provide a retry action when loading fails.
- Keep normal page scrolling usable on mobile.
- Avoid unnecessary automatic rotation or distracting animation.

Deliverable: a usable interactive 3D preview.

### TASK 1.4 — Implement AR launch and fallback

Configure model-viewer with AR enabled and the modes:

webxr scene-viewer quick-look

Use the supported component APIs and events for AR availability and launch. Do not rely solely on user-agent string detection.

Primary action:

**Katso omassa tilassasi**

The action must be visible and clearly explained. Make it usable when AR can be activated. If unavailable, show an explanation and keep the 3D viewer usable.

- Launch AR from a direct user action.
- Use horizontal surface placement for furniture.
- Check the sample's scale and floor alignment.
- Test automatic USDZ generation on iPhone; provide an explicit USDZ asset if needed.
- Account for Quick Look and Scene Viewer opening a platform-controlled experience.
- Handle reported launch failures and explain any cases where the external viewer's result cannot be observed by the web page.
- Do not add custom placement or camera controls that the selected AR mode does not support.

Example fallback text:

**Voit tarkastella huonekalua 3D-näkymässä. AR-katselu vaatii yhteensopivan puhelimen ja selaimen.**

Deliverable: working launch integration with a usable fallback.

### TASK 1.5 — Build the minimal interface

Single page, mobile first.

Header:
- Realitin AR identity.
- No additional navigation is required for one page.

Main content:
- Large interactive 3D viewer.
- Furniture name.
- Short instruction: "Pyöritä ja tarkastele huonekalua."
- Primary action: "Katso omassa tilassasi".
- Helper text: "Liikuta puhelinta ja sijoita huonekalu haluamaasi paikkaan."

Visual direction:
- Minimal Scandinavian design.
- Clear, comfortably sized typography.
- Generous spacing and a restrained colour palette.
- Large uninterrupted viewer area.
- Few decorative boxes.
- Accessible contrast and visible keyboard focus.
- Touch-friendly controls and meaningful button states.

Do not add a settings panel, model catalogue, login, upload control or AI button.

Deliverable: a clean and understandable page.

### TASK 1.6 — Validate and document

Local checks:
- Install dependencies successfully.
- Run the production build and configured type checks.
- Check that the GLB loads.
- Check rotation, zoom and responsive layout.
- Check loading, error and unsupported-AR states.
- Check keyboard access to page controls.

Phone test environment:
- Provide a reachable HTTPS URL with publicly reachable sample assets.
- Explain the selected hosting or secure tunnelling method.
- A phone's localhost points to the phone, not the development computer.
- An HTTP LAN address alone is not sufficient for WebXR verification.
- Do not claim a deployment exists unless it was created.

Physical tests:
- iPhone: compatible device, Safari, Quick Look launch, camera-based placement and visible scale.
- Android: compatible device, Chrome, available AR mode, placement and visible scale.
- Record device model, OS, browser, URL, AR mode and outcome.

Use this result format:

| Check | Result | Evidence or remaining action |
| --- | --- | --- |
| Production build | Passed / Failed / Not tested | Actual command and outcome |
| Desktop 3D preview | Passed / Failed / Not tested | Browser and observations |
| Mobile layout | Passed / Failed / Not tested | Actual or simulated browser |
| iPhone AR | Passed / Failed / Not tested | Actual device details |
| Android AR | Passed / Failed / Not tested | Actual device details |
| Model dimensions | Verified / Unverified | Dimension source |
| Error and fallback states | Passed / Failed / Not tested | Method and outcome |

Browser emulation does not count as a physical-device AR test. If you cannot test a phone, finish the implementation and give the owner exact test steps. Mark AR acceptance as pending.

## 6. PHASE 1 acceptance criteria

- The React application runs and builds.
- One real furniture GLB loads and can be rotated and zoomed.
- Loading and model errors are handled.
- The Finnish AR action launches the available supported experience.
- Unsupported environments retain a usable 3D preview.
- The furniture can be placed in a real environment on a tested compatible phone.
- iPhone and Android test results are reported separately.
- Sample licence and scale limitations are documented.
- No AI or image-processing dependency is needed.

Report implementation readiness separately from full AR acceptance. Full cross-platform acceptance remains pending until the required physical tests pass.

## 7. PHASE 2 — Improve AR reliability

Start only after the owner approves this phase.

- Validate physical dimensions and correct asset scale.
- Improve floor alignment and orientation.
- Improve materials, lighting and shadows where the active mode supports them.
- Optimize asset and texture size.
- Test additional furniture models.
- Improve performance, accessibility and placement instructions.
- Document differences between browser preview and each AR mode.

Goal: a predictable furniture-viewing experience with verified scale.

## 8. PHASE 3 — Image input and background removal

- Add PNG and JPG upload.
- Validate type and file size.
- Display the uploaded image.
- Inspect and reuse previous background-removal code if available.
- Otherwise evaluate a suitable implementation before integrating it.
- Show the transparent output and recoverable errors.
- Prepare the output for the later generation step.

Goal: upload a furniture image and inspect its background-removed result.

## 9. PHASE 4 — Image-to-3D generation

- Evaluate suitable services, such as Meshy or Tripo, using their current official API documentation.
- Compare furniture quality, output formats, latency, costs and usage rights.
- Integrate one selected service through a backend.
- Keep provider credentials on the backend.
- Track generation jobs and handle failure and retry.
- Validate generated assets and supply the GLB to the existing viewer.
- Optimize or convert assets when required.
- Confirm that generated models can launch through the existing AR path.

Possible progress labels:
- Kuvaa valmistellaan
- 3D-mallia luodaan
- Mallia viimeistellään
- Malli valmis
- Mallin luonti epäonnistui

Display only processing steps that actually exist. Do not invent progress percentages or promise instant generation.

A single image does not reliably determine hidden geometry or physical dimensions. Generated models require quality review and verified dimensions before accurate furniture-fit claims.

Blender is not the primary image-to-3D generator. Evaluate it later for automated scale correction, mesh processing, optimization or conversion if required.

Goal: a user image produces a model that can be previewed and tested in AR.

## 10. PHASE 5 — Complete product flow

- Connect upload, background removal, generation, preview and AR.
- Store and retrieve generated models.
- Provide understandable progress and recovery.
- Evaluate caching, processing costs and performance.
- Implement appropriate upload validation and access control.
- Test the complete journey on actual mobile devices.

Goal: one coherent journey from furniture photo to AR.

## 11. Required PHASE 1 handover

When finished, provide:

1. What was implemented.
2. Files created or modified.
3. Commands to install, run and build.
4. Sample model source, licence and dimension information.
5. How to make the test page available over HTTPS.
6. Exact iPhone and Android test steps.
7. Actual verification results and remaining physical tests.
8. Known platform limitations.
9. Steps to commit and push to the connected repository.

End the report by stating that PHASE 2 has not started and identifying any pending PHASE 1 acceptance checks.

## 12. First instruction

Read this entire document. Inspect the repository. Give a brief plan and implement PHASE 1 only. Report the outcome and stop before PHASE 2.

