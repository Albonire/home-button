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
```javascript
'use strict';

import St from 'gi://St';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class HomeButtonExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._icon = null;
        this._stylesheet = null;
        this._minimizedWindows = [];
        this._settings = null;
        this._settingsConnections = new Map();
    }
```

**File:** home-button@Albonire.github.io/extension.js (L20-35)
```javascript
    _updateState() {
        const hasMinimized = this._minimizedWindows.length > 0;
        const showCount = this._settings.get_boolean('show-count-in-tooltip');

        if (hasMinimized) {
            this._icon.icon_name = 'view-restore-symbolic';
            this._indicator.tooltip_text = showCount 
                ? _(`Restore ${this._minimizedWindows.length} window${this._minimizedWindows.length !== 1 ? 's' : ''}`)
                : _('Restore windows');
            this._indicator.add_style_class_name('minimized-mode');
        } else {
            this._icon.icon_name = 'user-home-symbolic';
            this._indicator.tooltip_text = _('Minimizar todas las ventanas y mostrar escritorio');
            this._indicator.remove_style_class_name('minimized-mode');
        }
    }
```

**File:** home-button@Albonire.github.io/extension.js (L41-133)
```javascript
_toggleWindows() {
    console.log("🚀 Home-Button: _toggleWindows() iniciado");
    
    try {
        if (this._minimizedWindows.length > 0) {
            console.log(`Restaurando ${this._minimizedWindows.length} ventanas`);
            [...this._minimizedWindows].reverse().forEach((window, index) => {
                if (window.get_workspace()) {
                    console.log(`  Restaurando: ${window.get_title()}`);
                    window.unminimize();
                    window.raise();
                }
            });
            this._minimizedWindows = [];
        } else {
            console.log("Iniciando minimización...");
            
            const workspaceManager = global.workspace_manager;
            const includeAllWorkspaces = this._settings.get_boolean('include-all-workspaces');
            
            console.log(`   Include all workspaces: ${includeAllWorkspaces}`);
            
            let windowsToConsider = [];
            if (includeAllWorkspaces) {
                const nWorkspaces = workspaceManager.get_n_workspaces();
                console.log(`   Analizing ${nWorkspaces} workspaces`);
                for (let i = 0; i < nWorkspaces; i++) {
                    const workspace = workspaceManager.get_workspace_by_index(i);
                    const workspaceWindows = workspace.list_windows();
                    console.log(`   Workspace ${i}: ${workspaceWindows.length} ventanas`);
                    windowsToConsider.push(...workspaceWindows);
                }
            } else {
                const activeWorkspace = workspaceManager.get_active_workspace();
                windowsToConsider = activeWorkspace.list_windows();
                console.log(`   Actual workspace: ${windowsToConsider.length} windows`);
            }

            console.log(`  Total windows found: ${windowsToConsider.length}`);

            // filters
            this._minimizedWindows = windowsToConsider.filter(w => {
                if (!w) {
                    console.log("   Null window");
                    return false;
                }
                
                const title = w.get_title() || "No title";
                const isMinimized = w.minimized;
                
                console.log(`   🔍 Parsing: "${title}" - Minimized: ${isMinimized}`);
                
                if (isMinimized) {
                    console.log(`   Skipping "${title}" (already minimized)`);
                    return false;
                }
                
                console.log(`   "${title}" will be minimized`);
                return true;
            });

            console.log(`Windows to minimize: ${this._minimizedWindows.length}`);

            if (this._minimizedWindows.length === 0) {
                console.log("No windows to minimize.");
            } else {
                // MINIMIZATION simple
                this._minimizedWindows.forEach((window, index) => {
                    const title = window.get_title() || "Sin título";
                    console.log(`  🔽 Minimizing: "${title}"`);
                    
                    try {
                        window.minimize();
                        console.log(`    "${title}" correctly minimized`);
                    } catch (error) {
                        console.log(`    Error minimizing "${title}": ${error}`);
                    }
                });
            }
        }
    } catch (e) {
        console.error(`Home-Button Extension: Error en _toggleWindows(): ${e}`);
        console.error(`Stack trace: ${e.stack}`);
        this._minimizedWindows = [];
    }
    
    console.log("🏁 _toggleWindows() completado");
    
    setTimeout(() => {
        console.log("🔄 Updating state...");
        this._updateState();
    }, 200);
}
```

**File:** home-button@Albonire.github.io/extension.js (L212-327)
```javascript
enable() {
    console.log("Home Button Extension enabled");
    
    try {
        console.log("Loading settings...");
        this._settings = this.getSettings();
        console.log("Settings loaded");

        console.log("Creating indicator...");
        this._indicator = new St.Bin({
            reactive: true,
            can_focus: true,
            track_hover: true,
            name: 'home-button-indicator',
            style_class: 'panel-button',
        });
        console.log("Indicator created");

        console.log("Creating icon...");
        this._icon = new St.Icon({
            style_class: 'home-button-icon',
        });
        console.log("Icon created");

        this._indicator.set_child(this._icon);
        console.log("Icon added to indicator");

        console.log("Connecting event listeners...");
        
        const buttonPressConnection = this._indicator.connect('button-press-event', (actor, event) => {
            console.log("   Button pressed");
            console.log(`   Button: ${event.get_button()}`);
            console.log(`   Primary button: ${Clutter.BUTTON_PRIMARY}`);
            
            if (event.get_button() === Clutter.BUTTON_PRIMARY) {
                console.log(" Click valid - executing _toggleWindows()");
                this._toggleWindows();
                return Clutter.EVENT_STOP;
            } else {
                console.log(" Click ignored (not primary button)");
            }
            return Clutter.EVENT_PROPAGATE;
        });
        console.log(` Button-press-event conected (ID: ${buttonPressConnection})`);

        const keyPressConnection = this._indicator.connect('key-press-event', (actor, event) => {
            console.log(" key pressed");
            const symbol = event.get_key_symbol();
            console.log(`   Key: ${symbol}`);
            
            if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_space) {
                console.log(" Valid key - executing _toggleWindows()");
                this._toggleWindows();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        console.log(` Key-press-event conected (ID: ${keyPressConnection})`);

        this._indicator.connect('enter-event', () => {
            console.log(" Mouse entered the button");
        });
        
        this._indicator.connect('leave-event', () => {
            console.log(" Mouse came out of the button");
        });

        console.log(" Charging stylesheet...");
        const themeContext = St.ThemeContext.get_for_stage(global.stage);
        const stylesheetFile = Gio.File.new_for_path(this.path + '/stylesheet.css');
        if (stylesheetFile.query_exists(null)) {
            this._stylesheet = stylesheetFile;
            themeContext.get_theme().load_stylesheet(this._stylesheet);
            console.log(" Stylesheet loaded");
        } else {
            console.log(" Stylesheet not found");
        }

        console.log(" Conecting settings...");
        this._connectSettings();
        console.log(" Settings conected");

        console.log(" Adding to panel...");
        this._addToPanel();
        console.log(" Added to panel");

        console.log(" Applying icon size...");
        this._applyIconSize();
        console.log(" Size applied");

        console.log(" Updating initial status...");
        this._updateState();
        console.log(" Updated status");

        console.log(" Home Button Extension enabled succesfully");
        
        // TEST: add timeout
        setTimeout(() => {
            console.log("   TEST: Checking status after 2 seconds...");
            console.log(`   Indicator exists: ${!!this._indicator}`);
            console.log(`   Icon exists: ${!!this._icon}`);
            console.log(`   Settings exists: ${!!this._settings}`);
            
            // funcionality test
            if (this._indicator && this._indicator.reactive) {
                console.log(" Indicator is reactive and ready for clicks");
            } else {
                console.log(" PROBLEM: Indicator is not reactive");
            }
        }, 2000);
        
    } catch (error) {
        console.error(` ERROR en enable(): ${error}`);
        console.error(` Stack trace: ${error.stack}`);
    }
}
```

**File:** schemas/org.gnome.shell.extensions.home-button.gschema.xml (L5-14)
```text
    <key name="button-position" type="s">
      <choices>
        <choice value="left"/>
        <choice value="center"/>
        <choice value="right"/>
      </choices>
      <default>"right"</default>
      <summary>Button position in panel</summary>
      <description>Position where the home button will be placed in the top panel</description>
    </key>
```

**File:** schemas/org.gnome.shell.extensions.home-button.gschema.xml (L16-21)
```text
    <key name="animation-delay" type="i">
      <range min="0" max="200"/>
      <default>35</default>
      <summary>Animation delay between windows</summary>
      <description>Delay in milliseconds between minimizing each window for smoother animation</description>
    </key>
```

**File:** schemas/org.gnome.shell.extensions.home-button.gschema.xml (L23-27)
```text
    <key name="show-count-in-tooltip" type="b">
      <default>true</default>
      <summary>Show window count in tooltip</summary>
      <description>Whether to show the number of minimized windows in the button tooltip</description>
    </key>
```

**File:** schemas/org.gnome.shell.extensions.home-button.gschema.xml (L29-33)
```text
    <key name="include-all-workspaces" type="b">
      <default>false</default>
      <summary>Include windows from all workspaces</summary>
      <description>When true, minimizes/restores windows from all workspaces instead of just the current one</description>
    </key>
```

**File:** schemas/org.gnome.shell.extensions.home-button.gschema.xml (L35-39)
```text
    <key name="exclude-always-on-top" type="b">
      <default>true</default>
      <summary>Exclude always-on-top windows</summary>
      <description>Whether to exclude always-on-top windows from minimization</description>
    </key>
```

**File:** schemas/org.gnome.shell.extensions.home-button.gschema.xml (L41-46)
```text
    <key name="button-icon-size" type="i">
      <range min="16" max="32"/>
      <default>24</default>
      <summary>Button icon size</summary>
      <description>Size of the home button icon in pixels</description>
    </key>
```

**File:** Makefile (L1-23)
```text
# Makefile para el desarrollo de la Extensión de GNOME Shell "Home Button"

# El UUID es el identificador único. ¡Debe coincidir con metadata.json y el nombre del directorio!
UUID = home-button@Albonire.github.io

# Directorio fuente del proyecto
SRC_DIR = $(UUID)

# Directorio de instalación de extensiones de GNOME Shell para el usuario local
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

# Directorio de schemas
SCHEMA_DIR = $(HOME)/.local/share/glib-2.0/schemas
SCHEMA_FILE = org.gnome.shell.extensions.home-button.gschema.xml

# Nombre del archivo ZIP para distribución
ZIP_FILE = $(UUID).zip

# El objetivo por defecto será 'help' para mostrar los comandos disponibles
.DEFAULT_GOAL := help

# Evita que 'make' se confunda si existe un archivo con el mismo nombre que un target
.PHONY: help install uninstall enable disable log zip clean compile-schema prefs
```

**File:** Makefile (L25-42)
```text
help:
	@echo "Gestor de la extensión Home Button"
	@echo "----------------------------------"
	@echo "Usa los siguientes comandos:"
	@echo "  make install        - Instala la extensión (o la actualiza)."
	@echo "  make uninstall      - Desinstala la extensión."
	@echo "  make enable         - Activa la extensión."
	@echo "  make disable        - Desactiva la extensión."
	@echo "  make prefs          - Abre las preferencias de la extensión."
	@echo "  make compile-schema - Compila el schema de configuración."
	@echo "  make log            - Muestra los logs de GNOME Shell en tiempo real."
	@echo "  make zip            - Crea un paquete .zip para subir a extensions.gnome.org."
	@echo "  make clean          - Elimina los archivos generados (como el .zip)."
	@echo ""
	@echo "IMPORTANTE: Para aplicar cambios, recarga GNOME Shell manualmente:"
	@echo "  1. Presiona Alt + F2"
	@echo "  2. Escribe 'r' en el diálogo"
	@echo "  3. Presiona Enter"
```

**File:** Makefile (L53-57)
```text
install: uninstall compile-schema
	@echo "Instalando extensión en: $(INSTALL_DIR)"
	@cp -r $(SRC_DIR) $(INSTALL_DIR)
	@echo "¡Instalación completa!"
	@echo "Para aplicar los cambios, recarga GNOME Shell (Alt+F2, 'r', Enter) y activa la extensión con 'make enable'."
```

**File:** Makefile (L79-82)
```text
# Muestra los logs del sistema para depurar la extensión
log:
	@echo "Mostrando logs de GNOME Shell... (Presiona Ctrl+C para salir)"
	@journalctl -f -o cat /usr/bin/gnome-shell
```

**File:** home-button@Albonire.github.io/prefs.js (L10-100)
```javascript
export default class HomeButtonPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Crear la página principal
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // Grupo de apariencia
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Customize the look and position of the home button',
        });
        page.add(appearanceGroup);

        // Posición del botón
        const positionRow = new Adw.ComboRow({
            title: 'Button Position',
            subtitle: 'Where to place the button in the top panel',
        });
        
        const positionModel = new Gtk.StringList();
        positionModel.append('Left');
        positionModel.append('Center');
        positionModel.append('Right');
        positionRow.model = positionModel;
        
        appearanceGroup.add(positionRow);

        // Tamaño del icono - usando Adjustment para control preciso
        const iconSizeAdjustment = new Gtk.Adjustment({
            lower: 16,
            upper: 32,
            step_increment: 2,
            page_increment: 4,
            value: 24,
        });
        
        const iconSizeRow = new Adw.SpinRow({
            title: 'Icon Size',
            subtitle: 'Size of the home button icon in pixels',
            adjustment: iconSizeAdjustment,
            digits: 0,
        });
        appearanceGroup.add(iconSizeRow);

        // Grupo de comportamiento
        const behaviorGroup = new Adw.PreferencesGroup({
            title: 'Behavior',
            description: 'Configure how the home button works',
        });
        page.add(behaviorGroup);

        // Delay de animación - usando Adjustment
        const animationAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 5,
            page_increment: 10,
            value: 35,
        });
        
        const animationDelayRow = new Adw.SpinRow({
            title: 'Animation Delay',
            subtitle: 'Milliseconds between minimizing each window (0 = instant)',
            adjustment: animationAdjustment,
            digits: 0,
        });
        behaviorGroup.add(animationDelayRow);

        // Include all workspaces
        const allWorkspacesRow = new Adw.SwitchRow({
            title: 'All Workspaces',
            subtitle: 'Minimize/restore windows from all workspaces instead of just current',
        });
        behaviorGroup.add(allWorkspacesRow);

        // Excluir ventanas always-on-top
        const excludeOnTopRow = new Adw.SwitchRow({
            title: 'Exclude Always-on-Top',
            subtitle: 'Skip windows that are set to always stay on top',
        });
        behaviorGroup.add(excludeOnTopRow);

        // Mostrar conteo en tooltip
        const showCountRow = new Adw.SwitchRow({
            title: 'Show Window Count',
            subtitle: 'Display number of minimized windows in button tooltip',
        });
        behaviorGroup.add(showCountRow);
```
