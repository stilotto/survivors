# Project Configuration

> Per-project variables used by loopprompt.md. Fill these in after running harness-init.sh
> or edit manually.

## Build Settings

- **Project file**: `survivor.xcodeproj`
- **Scheme**: `"survivor iOS"`
- **Simulator destination**: `platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5`

## Build Command

```bash
xcodebuild build \
  -project survivor.xcodeproj \
  -scheme "survivor iOS" \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
  -configuration Debug \
  2>&1 | tail -20
```

## Test Command

```bash
xcodebuild test \
  -project survivor.xcodeproj \
  -scheme "survivor iOS" \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' \
  -configuration Debug \
  2>&1 | tail -40
```

## Revert Command

```bash
git -C /Users/dmcgaug/dev/survivor checkout -- .
git -C /Users/dmcgaug/dev/survivor clean -fd
```

## Project-Specific Gotchas

> Add any toolchain quirks, manual steps, or known issues here.
> Example: "New .swift files must be added to Xcode via Add Files dialog"

- New `.swift` files must be manually added to Xcode via "Add Files to survivor..."
