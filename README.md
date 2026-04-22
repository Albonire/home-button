Based on my analysis of the codebase, here's a complete README in English for your Home Button GNOME Shell extension project:

# Home Button - GNOME Shell Extension

## Description

Home Button is a smart desktop toggle extension for GNOME Shell that adds a convenient button to your top panel. With a single click, you can minimize all open windows to show your desktop, and click again to restore them exactly as they were. It's the modern equivalent of the classic "Show Desktop" button, designed specifically for GNOME Shell with extensive customization options. [1](#0-0) 

---

## Features

- **Smart Window Management**: Minimize all windows with one click and restore them with another
- **Dynamic Icon**: Button icon changes to reflect current state (minimize vs. restore mode) [2](#0-1) 

- **Flexible Positioning**: Place the button on the left, center, or right side of your top panel [3](#0-2) 

- **Workspace Options**: Choose to minimize windows from current workspace only or all workspaces [4](#0-3) 

- **Customizable Icon Size**: Adjust button icon size from 16px to 32px [5](#0-4) 

- **Always-on-Top Support**: Option to exclude windows that are set to always stay on top [6](#0-5) 

- **Window Count Display**: See the number of minimized windows in the tooltip [7](#0-6) 

- **Smooth Animations**: Configurable delay between minimizing windows for visual appeal [8](#0-7) 

---

## Requirements

- GNOME Shell 45 or later
- GJS (GNOME JavaScript bindings)

---

## Installation

### Method 1: Using Make (Recommended)

```bash
# Clone the repository
git clone https://github.com/Albonire/home-button.git
cd home-button

# Install the extension
make install

# Reload GNOME Shell (Alt+F2, type 'r', press Enter)
# Or log out and log back in

# Enable the extension
make enable
``` [9](#0-8) 

### Method 2: Manual Installation

```bash
# Copy extension files
cp -r home-button@Albonire.github.io ~/.local/share/gnome-shell/extensions/

# Copy and compile schema
mkdir -p ~/.local/share/glib-2.0/schemas
cp schemas/org.gnome.shell.extensions.home-button.gschema.xml ~/.local/share/glib-2.0/schemas/
glib-compile-schemas ~/.local/share/glib-2.0/schemas/

# Enable the extension
gnome-extensions enable home-button@Albonire.github.io
```

---

## Configuration

Open the preferences window to customize the extension:

```bash
make prefs
# or
gnome-extensions prefs home-button@Albonire.github.io
```

### Available Settings

**Appearance:**
- **Button Position**: Choose where the button appears (Left, Center, or Right)
- **Icon Size**: Adjust the size of the button icon (16-32 pixels)

**Behavior:**
- **Animation Delay**: Set delay between minimizing windows (0-200ms)
- **All Workspaces**: Minimize/restore windows from all workspaces or just current
- **Exclude Always-on-Top**: Skip windows set to always stay on top
- **Show Window Count**: Display number of minimized windows in tooltip [10](#0-9) 

---

## Usage

1. Click the home button in your top panel to minimize all windows
2. The icon changes to a "restore" icon when windows are minimized
3. Click again to restore all minimized windows
4. The tooltip shows the current state and window count (if enabled) [11](#0-10) 

---

## Development

### Available Make Commands

```bash
make help           # Show all available commands
make install        # Install or update the extension
make uninstall      # Remove the extension
make enable         # Enable the extension
make disable        # Disable the extension
make prefs          # Open preferences
make log            # View GNOME Shell logs
make zip            # Create distribution package
make clean          # Remove generated files
``` [12](#0-11) 

### Project Structure

```
home-button/
├── home-button@Albonire.github.io/
│   ├── extension.js      # Main extension logic
│   ├── prefs.js          # Preferences UI
│   └── stylesheet.css    # Button styling
├── schemas/
│   └── org.gnome.shell.extensions.home-button.gschema.xml
└── Makefile              # Build and installation scripts
```

---

## Debugging

To view extension logs in real-time:

```bash
make log
# or
journalctl -f -o cat /usr/bin/gnome-shell
``` [13](#0-12) 

### Troubleshooting: missing `gschemas.compiled`
If the extension does not appear and you see errors such as:

```
GLib.FileError: Failed to open file "/home/<user>/.local/share/gnome-shell/extensions/home-button@Albonire.github.io/schemas/gschemas.compiled"
```

It means the extension's GSettings schema was not compiled or is not accessible in the places that GNOME Shell expects. To fix this, use `make install` (recommended) to both compile the XML schema and copy the compiled schema into the extension's `schemas/` folder, or use the commands below to compile and copy manually:

```bash
# Copy xml into the user schema directory and compile it there
mkdir -p ~/.local/share/glib-2.0/schemas
cp schemas/org.gnome.shell.extensions.home-button.gschema.xml ~/.local/share/glib-2.0/schemas/
glib-compile-schemas ~/.local/share/glib-2.0/schemas/

# Also compile the extension-local schema and copy it to the extension's installed schemas folder
glib-compile-schemas ./schemas
cp ./schemas/gschemas.compiled ~/.local/share/gnome-shell/extensions/home-button@Albonire.github.io/schemas/

# Then reload the shell (Alt+F2 → r) or log out/in
```

This fixes the `GLib.FileError` by ensuring `gschemas.compiled` exists where GNOME Shell checks.

---

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

---

## License

This project is open source. Please check the repository for license details.

---

## Acknowledgments

Created for the GNOME Shell desktop environment to provide a convenient way to manage desktop visibility and window states.

---

## Notes

This README is based on the current codebase structure. The extension provides comprehensive window management functionality with extensive debugging capabilities built-in [14](#0-13) . The Makefile provides convenient commands for development and installation [15](#0-14) , and the preferences UI uses modern Adwaita widgets for a native GNOME experience [16](#0-15) .

### Citations

**File:** home-button@Albonire.github.io/extension.js (L1-18)
